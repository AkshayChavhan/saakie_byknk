import 'server-only';
import {
  keywordSearchProducts,
  rowToRecommendedProduct,
  type KeywordProductRow,
} from '@/lib/ai/keyword-search';
import type { RecommendedProduct } from '@/types/chat';

/**
 * Retrieval-Augmented Generation (RAG) — Phase 4: keyword retrieval.
 *
 * Phase 3 gave Claude tools it could *choose* to call. Phase 4 inverts the
 * control flow: the server runs a search on every chat request, formats the
 * matches as a compact text block, and injects that block into the system
 * prompt — so Claude already has relevant products in context before it
 * starts writing the reply.
 *
 * Why this matters: most product questions can be answered in ONE Claude
 * call instead of two (decide → tool → observe → reply). The model is also
 * "grounded" — it can only name products that are in the block, which kills
 * a whole class of hallucinations.
 *
 * Why *keyword* retrieval (not embeddings) in this phase: it's the cheapest
 * possible RAG. No vector index, no embedding model, no backfill script —
 * just the same Prisma `OR` query Phase 3 already uses. Phase 5 will replace
 * this function's body with a vector search; the call sites, the context
 * format, and the system-prompt contract all stay the same.
 *
 * Trade-offs to be aware of:
 * - Keyword recall is *literal*. "Something elegant for winter" returns
 *   nothing useful because no product description contains those exact
 *   words. Phase 5 fixes that with semantic matching.
 * - We pay a Prisma roundtrip on every request, even for abstract questions
 *   like "how do I drape a saree". That's fine at this scale — Phase 6
 *   could cache by query if it becomes a hotspot.
 * - We don't rewrite the query (no extra LLM call) — the user message goes
 *   in verbatim. Multi-turn pronoun resolution is a Phase 6/8 concern.
 */

const DEFAULT_LIMIT = 6;
const DESCRIPTION_PREVIEW_CHARS = 120;

interface RetrieveContextOptions {
  /** Cap on retrieved products (default 6). */
  limit?: number;
}

export interface RetrievedContext {
  /** Products formatted for the chat UI sentinel; same shape as tools yield. */
  products: RecommendedProduct[];
  /**
   * A ready-to-append string of the form
   * `<retrieved_products>...</retrieved_products>` for the system prompt, or
   * empty when retrieval found nothing / the query was blank.
   */
  contextBlock: string;
}

/**
 * Run a keyword search against the live catalogue using the user's latest
 * message as the query, then format the results for prompt injection.
 *
 * Returns an empty `contextBlock` when the query is blank or no products
 * matched — the route checks for emptiness before deciding whether to
 * augment the prompt at all.
 */
export async function retrieveContext(
  userMessage: string,
  opts: RetrieveContextOptions = {}
): Promise<RetrievedContext> {
  const query = userMessage.trim();
  if (!query) {
    return { products: [], contextBlock: '' };
  }

  const limit = opts.limit ?? DEFAULT_LIMIT;
  const { rows, totalFound } = await keywordSearchProducts({ query }, limit);

  if (rows.length === 0) {
    return { products: [], contextBlock: '' };
  }

  return {
    products: rows.map(rowToRecommendedProduct),
    contextBlock: formatContextBlock(rows, { totalFound }),
  };
}

/**
 * Format the retrieved rows as a deterministic, scannable block for the
 * model. XML-style tags around the block (`<retrieved_products>...
 * </retrieved_products>`) are the convention Anthropic recommends for
 * delimiting instruction sections — they make it easy for Claude to "see"
 * where the catalogue context begins and ends.
 *
 * Per-product shape:
 *   N. <name> — ₹<price> — <category> — slug: <slug>
 *      <one-line description, truncated>
 *
 * Same fields the model would get from a `searchProducts` tool result, but
 * presented as natural-language lines instead of JSON. The model handles
 * both forms equally well; lines are slightly more token-efficient and a
 * bit easier to read in the prompt at debug time.
 */
function formatContextBlock(
  rows: KeywordProductRow[],
  meta: { totalFound: number }
): string {
  const header =
    `Below are products from the live Saakie catalogue that match the user's ` +
    `latest message (showing ${rows.length} of ${meta.totalFound} matches). ` +
    `Refer to them by name when recommending. Do NOT mention products that ` +
    `are not in this list, and do NOT invent prices, stock, or slugs.`;

  const lines = rows.map((row, i) => {
    const description = previewDescription(row);
    const head = `${i + 1}. ${row.name} — ₹${row.price.toLocaleString('en-IN')} — ${row.categoryName} — slug: ${row.slug}`;
    return description ? `${head}\n   ${description}` : head;
  });

  return [
    '<retrieved_products>',
    header,
    '',
    ...lines,
    '</retrieved_products>',
  ].join('\n');
}

function previewDescription(row: KeywordProductRow): string {
  const raw = (row.shortDescription ?? row.description ?? '').trim();
  if (!raw) return '';
  // Collapse whitespace so a multi-line description doesn't break our
  // per-product two-line layout, then truncate with an ellipsis.
  const oneLine = raw.replace(/\s+/g, ' ');
  return oneLine.length > DESCRIPTION_PREVIEW_CHARS
    ? `${oneLine.slice(0, DESCRIPTION_PREVIEW_CHARS - 1).trimEnd()}…`
    : oneLine;
}
