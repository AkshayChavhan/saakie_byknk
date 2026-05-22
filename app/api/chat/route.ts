import { NextResponse } from 'next/server';
import { openai, CHAT_MODEL } from '@/lib/ai/openai';
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
 * Fashion Assistant chat endpoint — Phase 1 (basic LLM chatbot).
 *
 * Flow: take the conversation from the client, prepend the system prompt
 * (the model's role + rules), call OpenAI's chat completions, return the reply.
 *
 * The response shape matches what the chat UI expects (see `types/chat.ts`):
 *   { message: string, products: RecommendedProduct[] }
 * `products` is always empty in Phase 1 — the assistant has no catalogue
 * access yet. Real products arrive in Phase 3 (tool calling).
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
      .map((m) => ({ role: m.role, content: m.content }));

    if (history.length === 0) {
      return NextResponse.json(
        { error: 'No valid messages provided' },
        { status: 400 }
      );
    }

    // The system prompt always goes first — it sets the model's behaviour.
    const completion = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: 'system', content: FASHION_ASSISTANT_SYSTEM_PROMPT },
        ...history,
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const message =
      completion.choices[0]?.message?.content?.trim() ||
      "Sorry, I couldn't come up with a response. Could you rephrase that?";

    // products is empty in Phase 1 — populated once the assistant can
    // actually query the catalogue (Phase 3).
    return NextResponse.json({ message, products: [] });
  } catch (error) {
    return apiError(error);
  }
}
