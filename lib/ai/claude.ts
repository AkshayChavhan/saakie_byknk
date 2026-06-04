import 'server-only';
import Anthropic from '@anthropic-ai/sdk';

/**
 * Anthropic (Claude) client singleton.
 *
 * Mirrors the `lib/prisma.ts` pattern: one instance reused across hot-reloads
 * in development so we don't open a new client on every request.
 *
 * Requires ANTHROPIC_API_KEY in the environment. Later phases that need
 * embeddings (Phase 5) or speech (Phase 13) will use a separate OpenAI client,
 * because Anthropic doesn't ship embeddings or speech models.
 */
const globalForAnthropic = globalThis as unknown as {
  anthropic: Anthropic | undefined;
};

if (!process.env.ANTHROPIC_API_KEY) {
  // Fail loudly at first use rather than getting a confusing 401 later.
  console.warn('[ai] ANTHROPIC_API_KEY is not set — /api/chat will fail.');
}

export const anthropic =
  globalForAnthropic.anthropic ??
  new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

if (process.env.NODE_ENV !== 'production') globalForAnthropic.anthropic = anthropic;

/**
 * The chat model used by the Fashion Assistant.
 *
 * `claude-haiku-4-5` — Anthropic's current cheap/fast tier. Fully tool-capable
 * (needed from Phase 3) and vision-capable (Phase 12). Roughly 2× the cost of
 * OpenAI's `gpt-4o-mini` per token — still negligible at this scale.
 */
export const CHAT_MODEL = 'claude-haiku-4-5';

export default anthropic;
