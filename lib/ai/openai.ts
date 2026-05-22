import 'server-only';
import OpenAI from 'openai';

/**
 * OpenAI client singleton.
 *
 * Mirrors the `lib/prisma.ts` pattern: one instance reused across hot-reloads
 * in development so we don't open a new client on every request.
 *
 * Requires OPENAI_API_KEY in the environment. The client itself is cheap to
 * construct — it just holds config — but keeping a singleton is tidy and
 * makes it the single place to configure timeouts/retries later.
 */
const globalForOpenAI = globalThis as unknown as {
  openai: OpenAI | undefined;
};

if (!process.env.OPENAI_API_KEY) {
  // Fail loudly at first use rather than getting a confusing 401 later.
  console.warn('[ai] OPENAI_API_KEY is not set — /api/chat will fail.');
}

export const openai =
  globalForOpenAI.openai ??
  new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

if (process.env.NODE_ENV !== 'production') globalForOpenAI.openai = openai;

/**
 * The chat model used by the Fashion Assistant.
 * gpt-4o-mini — fast, inexpensive, and fully tool-capable (needed from Phase 3).
 */
export const CHAT_MODEL = 'gpt-4o-mini';

export default openai;
