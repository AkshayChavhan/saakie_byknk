import { NextResponse } from 'next/server';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';
import { anthropic, CHAT_MODEL } from '@/lib/ai/claude';
import { FASHION_ASSISTANT_SYSTEM_PROMPT } from '@/lib/ai/prompts';
import {
  TOOLS,
  TOOL_DEFINITIONS,
  productsFromToolResult,
  type ToolResult,
} from '@/lib/ai/tools';
import { retrieveContext } from '@/lib/ai/retrieval';
import { apiError } from '@/lib/server/errors';
import type { RecommendedProduct } from '@/types/chat';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

type Role = 'user' | 'assistant' | 'system';
interface IncomingMessage {
  role: Role;
  content: string;
}

const MAX_HISTORY = 12;

/**
 * Hard cap on tool-loop iterations. Each iteration is one Claude turn that
 * may end in either text (we stop) or one+ tool_use blocks (we run them and
 * loop). 4 is plenty for Phase 3 — most real chats need 1, occasionally 2.
 * Phase 7 turns this into a configurable agent property.
 */
const MAX_TOOL_ITERATIONS = 4;

/**
 * How many products to retrieve into the RAG context block (Phase 4).
 * 6 is a sweet spot: enough variety for "show me silk under 5k", small
 * enough that the formatted block stays ~500 tokens.
 */
const RAG_LIMIT = 6;

/**
 * Sentinel that delimits the streamed text from the trailing structured
 * product payload on the wire. The browser splits on this exact string.
 *
 *   <streamed advice text>\n\n[[PRODUCTS]]{"products":[ ... ]}
 *
 * Phase 6 will replace this with proper SSE events; for Phase 3 the trick
 * is enough to ship structured data alongside a free-form text stream.
 */
const PRODUCTS_SENTINEL = '\n\n[[PRODUCTS]]';

/**
 * Fashion Assistant chat endpoint — Phase 3 (tool calling).
 *
 * Phase 2 streamed plain text. The model still had no live data, so
 * `products[]` was always empty. Phase 3 fixes both gaps at once:
 *
 *  1. The model is given three real tools (see `lib/ai/tools.ts`):
 *     searchProducts, getProductDetails, getCategories. Each hits Prisma.
 *
 *  2. The route runs an **agent loop**: ask Claude → if it wants a tool,
 *     run it → feed the result back → ask again → repeat until Claude
 *     replies with plain text (the user-facing answer).
 *
 *  3. After the loop ends, any products the tools surfaced are concatenated
 *     and appended to the stream after a sentinel string:
 *
 *        <streamed advice>\n\n[[PRODUCTS]]{"products":[...]}
 *
 *     The browser splits on the sentinel, attaches `products[]` to the
 *     assistant message, and the existing ProductCardMini cards render. The
 *     chat UI's `RecommendedProduct` type didn't need to change.
 *
 * Concept anchor — why a loop?
 * ────────────────────────────
 * Claude doesn't "execute" anything. When it decides a tool is needed it
 * just *describes the call it wants made* (`stop_reason: 'tool_use'`). Our
 * code runs the tool, packages the result as a `tool_result` user message,
 * and asks Claude again — now with the result available. The model uses
 * that to compose the final answer (or to call another tool). Phase 7
 * (`Agent`) generalises this loop with planning + multi-tool sequencing.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const messages: unknown = body?.messages;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'messages array is required' },
        { status: 400 }
      );
    }

    const history: MessageParam[] = (messages as IncomingMessage[])
      .filter(
        (m) =>
          m &&
          (m.role === 'user' || m.role === 'assistant') &&
          typeof m.content === 'string' &&
          m.content.trim().length > 0
      )
      .slice(-MAX_HISTORY)
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    if (history.length === 0) {
      return NextResponse.json(
        { error: 'No valid messages provided' },
        { status: 400 }
      );
    }

    // ─── Phase 4: RAG retrieval ────────────────────────────────────────────
    // Before we ask Claude anything, run a keyword search over the catalogue
    // using the user's latest message. Inject the matches into the system
    // prompt so Claude can answer "show me silk under 5k" in a SINGLE turn
    // instead of going through a tool_use round-trip.
    //
    // Done synchronously here (before the ReadableStream is constructed)
    // because:
    //   • The system prompt + RAG products must be ready before we start
    //     the first Claude turn.
    //   • Retrieval is a single Prisma round-trip — fast enough to keep on
    //     the critical path without hurting time-to-first-token noticeably.
    //   • Phase 7 will move this into the stream and surface "Searching
    //     catalog…" as a visible status; for now it's invisible plumbing.
    const lastUserMessage = [...history]
      .reverse()
      .find((m) => m.role === 'user' && typeof m.content === 'string');
    const ragQuery =
      typeof lastUserMessage?.content === 'string' ? lastUserMessage.content : '';

    const { products: ragProducts, contextBlock: ragContext } =
      await retrieveContext(ragQuery, { limit: RAG_LIMIT });

    const systemPrompt = ragContext
      ? `${FASHION_ASSISTANT_SYSTEM_PROMPT}\n\n${ragContext}`
      : FASHION_ASSISTANT_SYSTEM_PROMPT;

    const encoder = new TextEncoder();

    // Aggregated products across the request, deduped by id. Seeded with the
    // RAG results so they flow to the UI even when the model never calls a
    // tool — a "show me silk" question can now finish in one round-trip.
    const collectedProducts: RecommendedProduct[] = [];
    const seenProductIds = new Set<string>();
    const pushProducts = (ps: RecommendedProduct[]) => {
      for (const p of ps) {
        if (!seenProductIds.has(p.id)) {
          seenProductIds.add(p.id);
          collectedProducts.push(p);
        }
      }
    };
    pushProducts(ragProducts);

    // Track the currently-active upstream stream so `cancel()` can abort it.
    let activeStream: ReturnType<typeof anthropic.messages.stream> | null =
      null;
    let clientAborted = false;

    const stream = new ReadableStream({
      async start(controller) {
        const conversation: MessageParam[] = [...history];

        try {
          for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
            if (clientAborted) break;

            // 1. Ask Claude. The result MAY include text deltas (which we
            //    stream to the browser as they arrive) AND/OR tool_use blocks
            //    (which we collect from the final message at the end).
            const claudeStream = anthropic.messages.stream({
              model: CHAT_MODEL,
              max_tokens: 1024,
              temperature: 0.7,
              // Augmented with the Phase 4 RAG context block when retrieval
              // found relevant products; falls back to the base prompt
              // otherwise (e.g. an abstract "how do I drape" question).
              system: systemPrompt,
              messages: conversation,
              tools: TOOL_DEFINITIONS,
            });
            activeStream = claudeStream;

            for await (const event of claudeStream) {
              if (
                event.type === 'content_block_delta' &&
                event.delta.type === 'text_delta'
              ) {
                controller.enqueue(encoder.encode(event.delta.text));
              }
              // Other deltas we deliberately ignore on the user-visible
              // stream:
              //   - input_json_delta:   incremental tool_use input — useful in
              //                         Phase 7 to show "calling tool…", not now.
              //   - message_start/stop, content_block_start/stop: bookkeeping.
            }

            const final = await claudeStream.finalMessage();
            activeStream = null;

            // 2. If the model answered with plain text, we're done.
            if (final.stop_reason !== 'tool_use') break;

            // 3. Otherwise, execute every tool_use block and gather results.
            const toolUseBlocks = final.content.filter(
              (b): b is Extract<typeof b, { type: 'tool_use' }> =>
                b.type === 'tool_use'
            );

            const toolResults = await Promise.all(
              toolUseBlocks.map(async (block) => {
                const entry = TOOLS[block.name];
                if (!entry) {
                  return {
                    type: 'tool_result' as const,
                    tool_use_id: block.id,
                    content: JSON.stringify({
                      error: `Unknown tool "${block.name}".`,
                    }),
                    is_error: true,
                  };
                }
                try {
                  const output: ToolResult = await entry.handler(block.input);
                  pushProducts(productsFromToolResult(block.name, output));
                  return {
                    type: 'tool_result' as const,
                    tool_use_id: block.id,
                    content: JSON.stringify(output),
                  };
                } catch (err) {
                  const message =
                    err instanceof Error ? err.message : String(err);
                  console.error(`[chat/tool ${block.name}] failed:`, err);
                  return {
                    type: 'tool_result' as const,
                    tool_use_id: block.id,
                    content: JSON.stringify({ error: message }),
                    is_error: true,
                  };
                }
              })
            );

            // 4. Append both sides of the tool exchange to the conversation
            //    and loop. Claude must see its own tool_use blocks alongside
            //    the matching tool_result blocks.
            conversation.push({ role: 'assistant', content: final.content });
            conversation.push({ role: 'user', content: toolResults });
          }

          // 5. After the loop: append the structured product payload if any
          //    tool surfaced products. The browser parses on PRODUCTS_SENTINEL.
          if (collectedProducts.length > 0 && !clientAborted) {
            const payload = JSON.stringify({ products: collectedProducts });
            controller.enqueue(
              encoder.encode(`${PRODUCTS_SENTINEL}${payload}`)
            );
          }

          controller.close();
        } catch (err) {
          console.error('[chat/stream] aborted:', err);
          try {
            controller.enqueue(
              encoder.encode(
                '\n\n[The assistant ran into an error. Please try again.]'
              )
            );
          } catch {
            /* controller may already be closed */
          }
          controller.close();
        }
      },
      cancel() {
        clientAborted = true;
        activeStream?.abort();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
