# Phase 4 — Keyword RAG

**Branch:** `ai-phase-4-rag-keyword` (off `ai-phase-3-tools-2`)
**Concepts:** Retrieval-Augmented Generation (RAG) · grounding · keyword
retrieval as a baseline before vectors · formatting context for an LLM ·
RAG vs tools (when to use which)

---

## What this phase does

Phase 3 let Claude *choose* to look up products via tool calls. Phase 4
flips the control flow: the server **always retrieves first** — runs a
keyword search over the catalogue, formats the matches as a compact
context block, and injects that block into the system prompt before
Claude reads the user's message.

The effect is biggest on the most common kind of question — *"show me
silk sarees under ₹5,000"*. In Phase 3 that took two Claude turns
(decide → tool → observe → reply). In Phase 4 it takes **one**: the
products are already in the prompt, so the model can answer immediately.

This phase is deliberately the simplest form of RAG — *keyword* RAG. No
embeddings, no vector DB, no backfill script. Phase 5 will swap the
retrieval function for vector search, and everything around it stays
the same — that's the lesson.

## What changed

| File | What |
|---|---|
| `lib/ai/keyword-search.ts` | **New.** Shared Prisma query primitive — the `where`-clause builder and the row-to-`RecommendedProduct` mapper. Both Phase 3 tools and Phase 4 RAG go through here so they can't disagree about what "silk under 5k" returns. |
| `lib/ai/retrieval.ts` | **New.** `retrieveContext(userMessage, { limit })` — runs `keywordSearchProducts({ query }, 6)` and formats the results into a `<retrieved_products>` block plus the matching `RecommendedProduct[]`. |
| `lib/ai/tools.ts` | `searchProducts` is now a thin wrapper over `keywordSearchProducts`. No behaviour change — same results, same shape. |
| `lib/ai/prompts.ts` | New "USING RETRIEVED CONTEXT" section at the top, explaining how to consume the block. Tool guidance stays — RAG and tools coexist. |
| `app/api/chat/route.ts` | One new step at the top of `POST`: retrieve → augment the system prompt → seed `collectedProducts` with the RAG matches. The agent loop, sentinel emit, and cancel handling all unchanged. |

Untouched: `lib/ai/claude.ts`, `types/chat.ts`, `components/chat/*`,
`prisma/schema.prisma`, `package.json`. The chat UI works as-is — RAG
products flow through the same `[[PRODUCTS]]` sentinel the tools already
use.

## The four concepts

### 1. RAG, in one paragraph

Large language models are great at writing — but they don't know your
DB. RAG closes that gap by **R**etrieving relevant facts at request time
and **A**ugmenting the prompt with them, so the **G**eneration step has
ground truth right in front of it. The model isn't "trained" on your
catalogue; it's just *shown* the relevant pieces fresh on every request.

The whole point: kill a class of hallucinations by making the model
physically unable to mention products that aren't in the context.

### 2. Keyword retrieval — and why it's the right starting point

Keyword search is the kind every e-commerce site already has: `WHERE
name LIKE '%silk%' OR description LIKE '%silk%'`. Our `where`-clause
already does exactly that for the storefront and the Phase 3
`searchProducts` tool, so RAG reuses it verbatim. No new infrastructure.

Strengths:
- Zero new dependencies.
- Predictable: if the word appears in the data, it'll match.
- Sub-millisecond at our scale (a small `findMany` on an indexed table).

Limitations (the reason Phase 5 exists):
- **Literal.** *"Something elegant for a winter evening"* returns
  nothing — no product description contains those exact words.
- **Synonyms don't help.** A search for "kanjivaram" misses "kanchipuram"
  results.
- **Word order is irrelevant.** "Wedding silk" and "silk wedding" are
  treated identically.

Phase 5 fixes all three by encoding the user's intent as an embedding
vector and asking the DB for *semantically* nearby products. The
contract this file exposes (`retrieveContext(userMessage)` →
`{ products, contextBlock }`) doesn't change.

### 3. Formatting context for an LLM

The retrieved rows aren't dropped into the prompt as raw JSON. They're
formatted as scannable lines wrapped in XML-style tags:

```
<retrieved_products>
Below are products from the live Saakie catalogue that match the user's
latest message (showing 6 of 23 matches). Refer to them by name when
recommending. Do NOT mention products that are not in this list, and do
NOT invent prices, stock, or slugs.

1. Emerald Banarasi Silk — ₹4,200 — Silk Sarees — slug: emerald-banarasi-silk
   Soft drape silk with gold border, suited to evening receptions.
2. Royal Blue Kanjivaram — ₹3,900 — Silk Sarees — slug: royal-blue-kanjivaram
   ...
</retrieved_products>
```

Three deliberate choices:

- **XML tags** — Anthropic's own prompt guidance recommends them for
  delimiting instruction sections. They make it easy for Claude to
  identify where the catalogue context begins and ends.
- **Lines, not JSON** — slightly more token-efficient than `[{...}]`
  and easier to scan in the prompt at debug time. The model handles
  both equally well.
- **Deterministic field order** — `name — price — category — slug` on
  every row. Stable formatting makes the prompt cache-friendly (if you
  ever turn on Anthropic prompt caching) and easier to diff in tests.

### 4. RAG vs tools — when to use which

Both surface real products. They differ in *who decides*.

| | RAG (Phase 4) | Tools (Phase 3) |
|---|---|---|
| Who decides what to fetch | The server (always retrieves) | The model (decides per turn) |
| Round-trips to Claude | 1 for simple asks | 2+ for any tool call |
| Best at | First-pass relevance, grounding | Precise filters, follow-ups |
| Hallucination control | Strong (model only sees retrieved products) | Strong (only real DB rows return) |
| Cost per request | Fixed RAG tax (~500 tokens) every time | Pay only when tools fire |
| Multi-turn pronouns | Limited (we only see the last user message) | Strong (model has full context) |

Real production assistants use **both**, exactly like this codebase
does now. RAG gives the model a free first look so easy questions
finish in one turn; tools handle anything RAG missed — specific
filters, full product details, category listings.

## Trade-off: when RAG hurts

Every request now pays a small retrieval tax. For *"how do I drape a
saree?"* the keyword search runs anyway, returns six products, and they
end up in the prompt where the model ignores them — wasted bytes.

Acceptable for Phase 4 because:
- The Prisma query is cheap (~5 ms).
- The ~500-token context is dwarfed by Claude's per-call overhead.
- The win on product asks (skipping a whole tool round-trip) more
  than pays for the loss on non-product asks.

Phase 6 will add a re-ranker that can drop the block entirely when
relevance scores are too low — at which point this trade-off goes
away.

## What you'll see vs Phase 3

| Question | Phase 3 | Phase 4 |
|---|---|---|
| "Show me silk under ₹5,000" | Two Claude turns: decide → tool → observe → reply. Cards appear after the second turn finishes. | **One Claude turn.** Streaming starts almost immediately; cards appear from the RAG-seeded products. |
| "Tell me more about <name>" | One tool call (`getProductDetails`). | Same — RAG block doesn't include full details, so the tool is still the right path. |
| "What categories do you sell?" | Calls `getCategories`. | Same — RAG block is irrelevant; the model still calls the tool. |
| "What's the weather?" | Polite refusal. | Same — scope-limiting in the system prompt still wins; the empty-or-irrelevant RAG block changes nothing. |

## Try it

1. `npm run dev` on Node 22, open the chat bubble.
2. Ask *"Show me silk sarees under ₹5,000."* Tokens stream in fast;
   product cards appear from the RAG-seeded set. Watch the network tab —
   the chat response should arrive after a single Claude call.
3. Ask *"Tell me more about <name>"* (use a card from step 2). The model
   still calls `getProductDetails` — the RAG context was a summary, not
   the full record.
4. Ask *"What's a good fabric for winter?"* (no product mention). The
   model answers from its general knowledge; the RAG block (if any) is
   ignored or summarized briefly.

## Notes / what's next

- Same `ANTHROPIC_API_KEY` and credit as Phase 3. Per-request input
  tokens grow by ~500 (the context block) but every product question
  saves ~2k tokens by skipping a tool round-trip. Net win on shop chat.
- **Phase 5 — Semantic RAG.** Add an `embedding Float[]` field to
  `Product`, a backfill script using OpenAI's `text-embedding-3-small`,
  and a MongoDB Atlas Vector Search index. `lib/ai/retrieval.ts` swaps
  its internals from keyword search to a `$vectorSearch` aggregation;
  the route, prompts, and UI don't change.
- **Phase 6 — Hybrid + re-rank.** Run keyword *and* vector retrieval,
  merge candidates, then a re-ranker model decides the final order. The
  industry-default RAG quality bump.
