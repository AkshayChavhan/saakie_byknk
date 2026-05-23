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

// Cap how much conversation we send to the model — keeps cost/latency bounded.
const MAX_HISTORY = 12;

/**
 * Fashion Assistant chat endpoint — Phase 1 (basic LLM chatbot, Claude version).
 *
 * Same purpose as the OpenAI version this replaces: take the conversation from
 * the client, give the model its role + rules, get a reply.
 *
 * Anthropic's chat API differs from OpenAI in three small but important ways:
 *   1. Method: `anthropic.messages.create(...)` (not `chat.completions.create`).
 *   2. The system prompt goes in a top-level `system` field, NOT as a message
 *      with `role: 'system'` inside `messages`. The `messages` array only
 *      accepts `user` and `assistant` roles.
 *   3. `max_tokens` is REQUIRED (OpenAI treats it as optional).
 *   4. Response text lives at `response.content[0].text` — `content` is an
 *      array of content blocks; for a plain text reply the first block is type
 *      `text`. (Later phases will see `tool_use` blocks here too.)
 *
 * The response contract is unchanged from the OpenAI version — the chat UI
 * doesn't care which model produced the reply:
 *   { message: string, products: RecommendedProduct[] }
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

    // Keep only well-formed user/assistant turns, and only the recent ones.
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

    // The system prompt sets the model's behaviour. With Anthropic it is a
    // top-level field, not the first item in `messages`.
    const response = await anthropic.messages.create({
      model: CHAT_MODEL,
      max_tokens: 500,
      temperature: 0.7,
      system: FASHION_ASSISTANT_SYSTEM_PROMPT,
      messages: history,
    });

    // Pull the assistant's text out of the content-block array. `content` is
    // a union of block types (text, thinking, tool_use, …). For a plain reply
    // there is one block of type `text`. We narrow via the discriminator
    // (`block.type === 'text'`) so TypeScript knows `.text` is safe to read.
    // (Phase 3 will start handling `tool_use` blocks here too.)
    const textBlock = response.content.find((block) => block.type === 'text');
    const message =
      (textBlock && 'text' in textBlock ? textBlock.text : '').trim() ||
      "Sorry, I couldn't come up with a response. Could you rephrase that?";

    // products is empty in Phase 1 — populated once the assistant can
    // actually query the catalogue (Phase 3).
    return NextResponse.json({ message, products: [] });
  } catch (error) {
    return apiError(error);
  }
}
