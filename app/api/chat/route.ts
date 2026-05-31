import { NextResponse } from 'next/server';
import { anthropic, CHAT_MODEL } from '@/lib/ai/claude';
import { FASHION_ASSISTANT_SYSTEM_PROMPT } from '@/lib/ai/prompts';
import { apiError } from '@/lib/server/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

type Role = 'user' | 'assistant' | 'system';
interface IncomingMessage {
  role: Role;
  content: string;
}

// Cap how much conversation we send to the model — bounds cost/latency.
const MAX_HISTORY = 12;

/**
 * Fashion Assistant chat endpoint — Phase 2 (token streaming).
 *
 * Phase 1 returned the full reply as JSON only when the model finished. With
 * a five-sentence reply that's ~2–4 seconds of "Thinking…" before anything
 * appears. Streaming sends each token to the browser the moment Claude emits
 * it, so the user sees the reply appear word-by-word — the familiar
 * "ChatGPT typing" effect.
 *
 * How streaming works here (hand-built, no framework):
 *
 *   1. Ask the SDK for a stream — `anthropic.messages.stream({ ... })`.
 *      The SDK exposes an async iterator (`for await (event of stream)`)
 *      that yields events as Claude emits them. We only care about
 *      `content_block_delta` events with a `text_delta` payload — those are
 *      the actual reply tokens.
 *
 *   2. Pipe those text deltas into a `ReadableStream` that the route returns
 *      as the HTTP response body. Each delta is encoded with `TextEncoder`
 *      and `enqueue`d; when the model finishes, we `close()` the stream.
 *
 *   3. The client (`components/chat/chat-window.tsx`) reads the body with
 *      `response.body.getReader()`, decodes each chunk, and appends the text
 *      to the in-progress assistant message — re-rendering on each chunk.
 *
 * Wire format: plain `text/plain; charset=utf-8` — just the tokens
 * concatenated. (Not full SSE `data: ...\n\n` framing — that adds protocol
 * overhead we don't need yet. Phase 6, when the agent streams structured
 * "thinking → tool-call → result" events, will switch to SSE.)
 *
 * Trade-off: this Phase changes the response shape. Phase 1 returned
 *   { message: string, products: RecommendedProduct[] }
 * Phase 2 returns
 *   <plain streamed text>
 * Products come back in Phase 3 via a structured trailing event after the
 * text stream. The chat UI is updated in this commit to match.
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

    const history = (messages as IncomingMessage[])
      .filter(
        (m) =>
          m &&
          (m.role === 'user' || m.role === 'assistant') &&
          typeof m.content === 'string' &&
          m.content.trim().length > 0
      )
      .slice(-MAX_HISTORY)
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    if (history.length === 0) {
      return NextResponse.json(
        { error: 'No valid messages provided' },
        { status: 400 }
      );
    }

    // Build the streaming request. Note `stream` is implicit — the SDK's
    // `.stream()` helper handles the protocol details and gives us a typed
    // async iterator over events.
    const claudeStream = anthropic.messages.stream({
      model: CHAT_MODEL,
      max_tokens: 500,
      temperature: 0.7,
      system: FASHION_ASSISTANT_SYSTEM_PROMPT,
      messages: history,
    });

    const encoder = new TextEncoder();

    // The route returns a Web ReadableStream as its body. Inside `start`, we
    // iterate Claude's events and `enqueue` text deltas as bytes. When Claude
    // finishes (or errors), we close the stream.
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of claudeStream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              controller.enqueue(encoder.encode(event.delta.text));
            }
            // Other event types we deliberately ignore here:
            //   - message_start / content_block_start / message_stop:
            //     bookkeeping; nothing the user needs to see.
            //   - thinking deltas: Phase 1 doesn't use extended thinking.
            //   - tool_use deltas: Phase 3+ — handled there.
          }
          controller.close();
        } catch (err) {
          // If the model errors mid-stream we surface a short message and
          // close cleanly so the browser doesn't hang.
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
        // The client closed the connection (closed the tab, navigated away).
        // Abort the upstream Claude request so we stop paying for tokens.
        claudeStream.abort();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        // Prevent intermediaries from buffering — important for streaming.
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
