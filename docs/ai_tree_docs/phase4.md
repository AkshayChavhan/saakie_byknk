User types "Show me silk sarees under ₹5000" in the chat bubble
  │
  ▼
components/chat/chat-window.tsx → sendMessage()
  │
  │  1. Seed the empty assistant message (unchanged from Phase 2)
  │  ──────────────────────────────────────────────────────────────
  │     userMessage      → { role: "user",      content: "Show me silk..." }
  │     assistantSeed    → { role: "assistant", content: "" }   ← grows live
  │     We remember assistantId so streamed chunks find this bubble.
  │
  │  2. POST /api/chat  (request body unchanged from Phase 2/3)
  │     {
  │       "messages": [
  │         { "role": "assistant", "content": "Hello! I'm your..." },
  │         { "role": "user",      "content": "Show me silk sarees..." }
  │       ]
  │     }
  ▼
app/api/chat/route.ts → POST handler
  │  1. Parse JSON body → `messages`
  │  2. Validate non-empty array (else 400)
  │  3. Filter to user/assistant turns with non-empty content
  │  4. Slice last 12 (MAX_HISTORY) → bounds cost / latency
  │  5. Map to Claude shape: [{ role, content }, ...]
  │     (steps 1–5 unchanged from Phase 2/3 — RAG is a NEW step BEFORE
  │      the stream is built, not a change to history handling)
  │
  │  6. ★ NEW IN PHASE 4 ★ — RAG retrieval BEFORE we touch Claude
  │  ──────────────────────────────────────────────────────────────
  │     const lastUserMessage = [...history].reverse()
  │                              .find(m => m.role === 'user')
  │     const ragQuery        = lastUserMessage?.content ?? ''
  │
  │     const { products: ragProducts, contextBlock: ragContext } =
  │       await retrieveContext(ragQuery, { limit: 6 })
  │            │
  │            ▼
  │     lib/ai/retrieval.ts → retrieveContext()
  │       │
  │       │  a. Trim query. Empty? return { products:[], contextBlock:'' }
  │       │  b. Call keywordSearchProducts({ query }, 6)
  │       │       │
  │       │       ▼
  │       │     lib/ai/keyword-search.ts → keywordSearchProducts()
  │       │       │
  │       │       │  • buildProductWhere({ query: "Show me silk sarees..." })
  │       │       │      where = {
  │       │       │        isActive: true,
  │       │       │        OR: [
  │       │       │          { name: { contains: "Show me silk...", insensitive }},
  │       │       │          { description: { contains: ..., insensitive }},
  │       │       │          { tags: { has: "Show me silk..." }},
  │       │       │        ],
  │       │       │      }
  │       │       │  • Promise.all([
  │       │       │      prisma.product.findMany({ where, take:6, ... }),
  │       │       │      prisma.product.count({ where }),
  │       │       │    ])
  │       │       │  • rows.map(toRow) → KeywordProductRow[] {
  │       │       │        id, name, slug, price, description,
  │       │       │        shortDescription, categoryName, imageUrl
  │       │       │      }
  │       │       │
  │       │       │  ← Returns { rows: KeywordProductRow[], totalFound: N }
  │       │       ▼
  │       │     Back in retrieveContext()
  │       │
  │       │  c. No rows? return { products:[], contextBlock:'' }
  │       │  d. Build the context block:
  │       │       <retrieved_products>
  │       │       Below are products from the live Saakie catalogue
  │       │       that match the user's latest message (showing 6 of 23
  │       │       matches). Refer to them by name when recommending.
  │       │       Do NOT mention products that are not in this list,
  │       │       and do NOT invent prices, stock, or slugs.
  │       │
  │       │       1. Emerald Banarasi Silk — ₹4,200 — Silk Sarees — slug: emerald-banarasi-silk
  │       │          Soft drape silk with gold border, suited to evening receptions.
  │       │       2. Royal Blue Kanjivaram — ₹3,900 — Silk Sarees — slug: royal-blue-kanjivaram
  │       │          Classic temple-border weave, festival-ready.
  │       │       ...4 more...
  │       │       </retrieved_products>
  │       │
  │       │  e. Map rows → RecommendedProduct[] (same shape ProductCardMini
  │       │     and Phase 3's [[PRODUCTS]] sentinel already use).
  │       │
  │       │  Returns { products, contextBlock }
  │       ▼
  │     ragProducts: RecommendedProduct[] = [...6 items...]
  │     ragContext : string              = "<retrieved_products>...</retrieved_products>"
  │
  │  7. ★ Augment the system prompt with the retrieved context ★
  │  ──────────────────────────────────────────────────────────────
  │     systemPrompt = ragContext
  │       ? `${FASHION_ASSISTANT_SYSTEM_PROMPT}\n\n${ragContext}`
  │       : FASHION_ASSISTANT_SYSTEM_PROMPT
  │
  │     What Claude sees as `system` is now:
  │
  │       You are the Fashion Assistant for "Saakie"...
  │       VOICE & STYLE / WHAT YOU HELP WITH / ...
  │
  │       USING RETRIEVED CONTEXT (READ THIS FIRST)
  │         A <retrieved_products> block may be appended below this
  │         prompt with sarees that already match the user's latest
  │         message. Prefer those products...
  │
  │       TOOLS (USE THEM — DO NOT INVENT)
  │         - searchProducts, getProductDetails, getCategories
  │
  │       <retrieved_products>
  │       Below are products from the live Saakie catalogue...
  │       1. Emerald Banarasi Silk — ₹4,200 — ...
  │       ...
  │       </retrieved_products>
  │
  │  8. ★ Seed collectedProducts with RAG matches ★
  │  ──────────────────────────────────────────────────────────────
  │     pushProducts(ragProducts)
  │       ↑ The 6 RAG products go straight into collectedProducts (deduped
  │         by id). They will reach the UI via the [[PRODUCTS]] sentinel
  │         EVEN IF the model never calls a tool — which is the whole
  │         point of Phase 4: single-turn product asks finish in one
  │         Claude call.
  ▼
═══════════════ AGENT LOOP — iteration 1 ═══════════════════════════════
  │
  │  9. Ask Claude — with augmented system prompt AND tools
  │  ──────────────────────────────────────────────────────────────
  │     const claudeStream = anthropic.messages.stream({
  │       model:       "claude-haiku-4-5",
  │       max_tokens:  1024,
  │       temperature: 0.7,
  │       system:      systemPrompt,           ← NOW INCLUDES RAG CONTEXT
  │       messages:    conversation,
  │       tools:       TOOL_DEFINITIONS,       ← still available, just often unused
  │     })
  │     activeStream = claudeStream
  │
  │     What changes vs Phase 3:
  │     • Phase 3: model sees just rules + tool list → MUST call
  │                searchProducts to know any product. Two-turn answer.
  │     • Phase 4: model already sees the 6 matching sarees in
  │                <retrieved_products>. It can write the reply DIRECTLY.
  │                Tool call becomes optional, not mandatory.
  │
  │ 10. Stream text deltas to the user — unchanged
  │  ──────────────────────────────────────────────────────────────
  │     for await (event of claudeStream) {
  │       if (event.type === 'content_block_delta' &&
  │           event.delta.type === 'text_delta') {
  │         controller.enqueue(encoder.encode(event.delta.text))
  │       }
  │     }
  │
  │     What Claude actually streams here, with RAG in place:
  │       "I found six lovely silk sarees in your budget. The Emerald
  │        Banarasi at ₹4,200 has a soft drape that suits evening
  │        receptions. The Royal Blue Kanjivaram at ₹3,900 is more
  │        festival-friendly..."
  │
  │     Notice: every product name + price comes verbatim from the
  │     <retrieved_products> block. The model is GROUNDED — physically
  │     cannot invent products that aren't in the block.
  │
  │ 11. Inspect the finished turn
  │  ──────────────────────────────────────────────────────────────
  │     const final = await claudeStream.finalMessage()
  │     activeStream = null
  │
  │     final.stop_reason === 'end_turn'   ← model is done, RAG was enough
  │     → break out of the loop. NO TOOL CALL NEEDED.
  │
  │  (If the question had been "tell me more about the emerald one",
  │   the model would have emitted a getProductDetails tool_use here —
  │   RAG covers the summary, tools cover the deep details. The loop
  │   would run a 2nd iteration just like Phase 3, see docs/ai_tree_docs/phase3.md.)
  ▼
═══════════════ AFTER THE LOOP ═══════════════════════════════════════
  │
  │ 12. Emit the trailing PRODUCTS sentinel (unchanged from Phase 3)
  │  ──────────────────────────────────────────────────────────────
  │     if (collectedProducts.length && !clientAborted) {
  │       const payload = JSON.stringify({ products: collectedProducts })
  │       controller.enqueue(encoder.encode(`\n\n[[PRODUCTS]]${payload}`))
  │     }
  │     controller.close()
  │
  │     collectedProducts here = the 6 RAG products from step 8
  │     (no tool ran, so nothing was added during the loop).
  │
  │     Final bytes on the wire:
  │       "I found six lovely silk sarees...\n\n[[PRODUCTS]]{"products":[...6...]}"
  │
  │ 13. cancel() — unchanged from Phase 3
  │  ──────────────────────────────────────────────────────────────
  │     cancel() { clientAborted = true; activeStream?.abort() }
  ▼
components/chat/chat-window.tsx → read loop (unchanged from Phase 3)
  │
  │ 14. Split on the sentinel, attach products[] to the message
  │  ──────────────────────────────────────────────────────────────
  │     visibleText = received.slice(0, indexOf("\n\n[[PRODUCTS]]"))
  │     products    = JSON.parse(received.slice(after sentinel)).products
  │     setMessages(prev => prev.map(m =>
  │       m.id === assistantId
  │         ? { ...m, content: visibleText, products }
  │         : m
  │     ))
  │
  │ 15. React renders — unchanged
  │     • message.content        → ChatMessage bubble (streamed text)
  │     • message.products?.map  → ProductCardMini grid under the bubble
  ▼
User sees:
  ┌────────────────────────────────────────────────────────┐
  │  🤖  I found six lovely silk sarees in your budget.    │
  │      The Emerald Banarasi at ₹4,200 has a soft drape   │
  │      that suits evening receptions. The Royal Blue     │
  │      Kanjivaram at ₹3,900 is more festival-friendly…   │
  │                                                        │
  │      [🖼  Emerald Banarasi    ₹4,200]                  │
  │      [🖼  Royal Blue Kanj.    ₹3,900]                  │
  │      [🖼  Ivory Pochampally   ₹3,600]                  │
  │      ...                                                │
  └────────────────────────────────────────────────────────┘


─── Pin these for Phase 5 / 6 ─────────────────────────────────────────

• RAG = "look stuff up BEFORE you generate."
  Tools  = "let the model decide what to look up DURING generation."
  Phase 4 always runs RAG; tools still available as a fallback.

• Token cost moved, didn't disappear:
  Phase 3 typical: 1× input (rules+tools) + tool call + 2× input (above
                   + tool_result) + output ≈ a "two-turn" bill.
  Phase 4 typical: 1× input (rules+tools+RAG context) + output ≈ ONE turn.
  For pure non-product asks ("how do I drape?"), Phase 4 pays a small
  RAG tax (~500 tokens of unused context) that Phase 3 wouldn't have.
  Net win on shop questions, small loss on abstract ones.

• Keyword retrieval is LITERAL. "Something elegant for a winter evening"
  finds nothing because no description contains those exact words.
  Phase 5 fixes this with embeddings: turn the query into a semantic
  vector, find the nearest product vectors in MongoDB Atlas Vector Search.
  The retrieveContext() signature and the rest of the route stay the same.

• Grounding via prompt is fragile if the user can manipulate the input
  (prompt injection). Phase 9 adds guardrails — output validation that
  only RAG-or-tool-returned product IDs reach the UI's sentinel.

• retrieveContext() and keywordSearchProducts() are deliberately
  decoupled — Phase 5 will replace ONLY the body of keywordSearchProducts
  (or add a sibling vector-search.ts that retrieval.ts delegates to),
  with no changes to the route, prompts, or UI.
