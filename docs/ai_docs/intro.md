# Fashion Assistant — Full AI Curriculum

> A progressive, learning-oriented build of an AI shopping assistant for the
> Saakie saree shop. **16 phases**, each a separate git branch + commit + a
> short learning note — so you can learn modern AI engineering end-to-end by
> reading the diffs in order.

---

## 0. Why this document exists

The goal is to **learn modern AI engineering** — LLM apps, RAG, agents,
agentic AI, observability, multimodal, voice, MCP, multi-agent systems, and
frameworks — by *actually building them* into this project, then learning from
the commits and branch diffs.

The plan is deliberately **layered and broad**. Each phase:
- Builds on the previous one.
- Lives on its own branch (`ai-phase-N-<slug>`).
- Has one focused commit (or a few) you can read top-to-bottom.
- Teaches **one core concept**, with a `docs/ai_docs/phase-N.md` learning note.

You learn by: checkout the branch in order → read the `phase-N.md` note →
read the diff → run the app → watch the behaviour change.

---

## 1. What already exists (the starting point)

- **Chat UI is fully built** — `components/chat/` (`ChatBubble`, `ChatWindow`,
  `ChatMessage`, `ProductCardMini`), mounted globally in `components/providers.tsx`.
- It already **POSTs to `/api/chat`** with `{ messages: [...] }` and expects
  `{ message: string, products: RecommendedProduct[] }` back — see `types/chat.ts`.
- **`/api/chat` does not exist yet** → the chat currently 404s.
- `openai` SDK (v6) is installed; `OPENAI_API_KEY` is in `.env`. **Nothing uses it yet.**
- Data: MongoDB Atlas via Prisma. Rich `Product` model (~28 fields: name,
  description, price, material, occasion, pattern, fabric, colors, tags…).
- **MongoDB Atlas has native Vector Search** — this is what makes real RAG
  possible without adding Pinecone/Weaviate.

So: the front end is done. **Every phase below is backend + a little UI polish.**

> ⚠️ **Security note:** real API keys are committed in `.env`. Rotate them
> and confirm `.env` is gitignored before this work is pushed publicly.

---

## 2. Confirmed decisions

- **Plain provider SDKs** for the hand-built phases (1–15) — no framework, so
  every mechanism (streaming, tool-call loop, agent loop) is hand-written and
  the loop logic *is* the lesson. LangChain comes **last** (Phase 16),
  deliberately.
- **Chat model: Anthropic Claude** — `claude-haiku-4-5` via the official
  `@anthropic-ai/sdk`. Claude is a better fit for the agentic + MCP phases
  later (P7, P8, P14, P15).
- **OpenAI is still needed for two things** (Anthropic doesn't ship them):
  - **Embeddings** (Phase 5, semantic RAG) — `text-embedding-3-small`.
  - **Voice** (Phase 13) — Whisper (STT) + TTS.
  So `.env` carries **both** `ANTHROPIC_API_KEY` and `OPENAI_API_KEY`. Two
  providers in one app is normal.
- **File-naming rule:** any file whose code is **tied to one provider** has the
  provider in its name — `lib/ai/claude.ts`, later `lib/ai/openai-embeddings.ts`.
  Provider-agnostic files (`lib/ai/prompts.ts`, `app/api/chat/route.ts`,
  `lib/ai/tools.ts`, …) keep generic names. So at a glance, you know which
  files would need touching if the underlying provider ever swapped.
- **Vector store:** MongoDB Atlas Vector Search — already the DB, no new infra.
- One phase = one branch + focused commit(s) + a `phase-N.md` note; built and
  verified one at a time, **stopping after each for review**.

---

## 3. The curriculum — 16 phases

### — Foundations —

**Phase 1 — `ai-phase-1-chatbot`** · *LLM call, prompt engineering*
Basic LLM chatbot. `lib/ai/openai.ts` (client singleton), `lib/ai/prompts.ts`
(system prompt defining the assistant's role + rules), `app/api/chat/route.ts`
(POST → system prompt + `chat.completions` → `{ message, products: [] }`).
The bot knows nothing about real products yet — that's the baseline.

**Phase 2 — `ai-phase-2-streaming`** · *streaming UX, async iterators*
Token-by-token streaming, hand-built: the `openai` SDK's `stream: true` yields
an async iterator of chunks → piped into a `ReadableStream` SSE response;
`ChatWindow` reads the stream and appends tokens live.

### — Tools & structured output —

**Phase 3 — `ai-phase-3-tools`** · *function calling, structured output*
Tool/function calling. `lib/ai/tools.ts` defines `searchProducts`,
`getProductDetails`, `getCategories` (query the DB). Tool args + results are
validated with **Zod schemas** (JSON mode). The model decides when to call a
tool → the route runs it → real products fill the `products[]` cards.

### — RAG —

**Phase 4 — `ai-phase-4-rag-keyword`** · *the RAG pattern*
RAG, the simple version. `lib/ai/retrieval.ts`: keyword-search products →
format a compact context block → inject into the prompt → instruct the model
"answer only from this context, don't invent products". RAG without embeddings.

**Phase 5 — `ai-phase-5-rag-vectors`** · *embeddings, vector search*
Semantic RAG. Add an `embedding Float[]` field to `Product`;
`scripts/embed-products.ts` backfills vectors via the embeddings API; create a
MongoDB Atlas Vector Search index; `lib/ai/vector-search.ts` runs a
`$vectorSearch` aggregation; swap the retriever to vectors. Now "something
elegant for a winter reception" works with no keyword overlap.
**Provider note:** Anthropic doesn't ship an embeddings model, so this phase
introduces a small OpenAI client in its own file — `lib/ai/openai-embeddings.ts`
— calling `text-embedding-3-small`. (Per the naming rule above, that file
makes the OpenAI dependency obvious.)

**Phase 6 — `ai-phase-6-hybrid-rerank`** · *hybrid retrieval, re-ranking*
Hybrid search: run keyword + vector search, merge the candidates, then a
**re-ranker** model orders the final results — measurably better RAG quality.

### — Agents —

**Phase 7 — `ai-phase-7-agent`** · *the agent pattern*
The agent: a hand-written reason→act→observe loop with a `maxSteps` guard. More
tools (`checkStock`, `getSimilarProducts`, `getReviewSummary`). The agent's
intermediate tool-use is streamed to the UI ("Searching catalog…").

**Phase 8 — `ai-phase-8-agentic`** · *memory, planning, personalization*
Agentic AI. `ChatSession` / `ChatMessage` Prisma models for persistent memory
(across turns and visits); auth-gated personalization tools (`getMyOrders`,
`getMyWishlist`); planning for complex asks; self-correction (reformulate and
retry when a tool returns nothing).

### — Production —

**Phase 9 — `ai-phase-9-guardrails`** · *AI safety*
Scope-limiting (politely refuse non-shop questions), prompt-injection
resistance, output validation (only real product IDs reach the UI), rate
limiting on `/api/chat`.

**Phase 10 — `ai-phase-10-observability`** · *observability, cost tracing*
AI tracing with **Langfuse** (free tier / self-host): every prompt, tool call,
token count, latency, and **cost per request** visible on a dashboard. The top
production-AI skill most tutorials skip.

**Phase 11 — `ai-phase-11-evals`** · *measuring AI quality*
A `tests/ai/` eval suite: a fixed set of questions with expected behaviour
(recommends in-budget items? refuses off-topic? avoids hallucinated products?),
run like tests. Proving the AI works rather than vibe-checking it.

### — Advanced / multimodal —

**Phase 12 — `ai-phase-12-vision`** · *multimodal, vision*
Image search: upload a photo → Claude vision (the same `claude-haiku-4-5` /
Sonnet describes it) → embed the description → vector search → "find sarees
like this photo". Claude handles vision natively — no extra provider needed
for this phase.

**Phase 13 — `ai-phase-13-voice`** · *speech AI*
Voice chat: mic input → Whisper (speech-to-text) → Claude → TTS reply audio.
**Provider note:** Anthropic doesn't ship speech models. This phase adds a
small OpenAI client in its own file — `lib/ai/openai-voice.ts` — for Whisper
+ TTS. The main chat path stays Claude.

**Phase 14 — `ai-phase-14-mcp`** · *MCP — tool interop standard*
Expose the shop's tools as a **Model Context Protocol** server, so any MCP
client (Claude, etc.) can use the catalog tools. Adds `@modelcontextprotocol/sdk`
(the official Anthropic Claude SDK has MCP helpers but not a full client).

**Phase 15 — `ai-phase-15-multi-agent`** · *multi-agent systems*
Two cooperating agents — a **Stylist** agent (taste, outfit advice) and a
**Catalog** agent (search, stock, price) — coordinated by an orchestrator.

### — Frameworks (deliberately last) —

**Phase 16 — `ai-phase-16-langchain`** · *a framework, understood properly*
Re-implement the RAG pipeline + agent with **LangChain.js**, side-by-side with
the hand-built versions. Because you built everything raw first, you now see
exactly what the framework abstracts: your retrieve-and-format ≈ a `Retriever`,
your `while` loop ≈ an `AgentExecutor`. Core LangChain; **LangGraph / LangSmith
decided at this point** (likely a 16b).

> **Ordering rationale:** build raw → make it good (RAG/agents) → make it safe &
> observable → extend (multimodal / voice / MCP / multi-agent) → only then
> frameworks. Learning a framework before the fundamentals is backwards.

---

## 4. Architecture (where AI code lives)

**File layout:**
```
lib/ai/  openai.ts · prompts.ts · tools.ts · retrieval.ts · vector-search.ts ·
         rerank.ts · agent.ts · guardrails.ts · observability.ts ·
         vision.ts · voice.ts · agents/ (multi-agent) · langchain/
app/api/chat/route.ts        thin — orchestrates lib/ai
app/api/ai/mcp/route.ts      MCP server endpoint (Phase 14)
scripts/embed-products.ts    one-off embedding backfill
tests/ai/                    eval suite (Phase 11)
docs/ai_docs/                intro.md (master) + phase-N.md notes
```

**Runtime flow** — one chat request travelling through the system. Each node is
labelled with its 2-word use case and the phase that adds it:

```
 ChatBubble / ChatWindow            (user chat)         ◀── exists
        │  POST { messages, image?, audio? }
        ▼
 app/api/chat/route.ts              (request orchestration)   P1
        │
        ├─ lib/ai/voice.ts          (speech in/out)     P13
        ├─ lib/ai/vision.ts         (image understand)  P12
        ▼
 lib/ai/prompts.ts                  (role rules)        P1
        │  lib/ai/guardrails.ts ────(safety filter)     P9
        ▼
 lib/ai/agent.ts ── reason→act→observe loop  (multi step)     P7
        │     lib/ai/agents/* ──────(multi agent)       P15
        │
        ├─▶ lib/ai/tools.ts         (catalog actions)   P3  [Zod-validated]
        │        ├─▶ retrieval.ts       (keyword retrieve)   P4
        │        ├─▶ vector-search.ts   (semantic retrieve)  P5
        │        └─▶ rerank.ts          (rank results)       P6
        │                  │ $vectorSearch
        │                  ▼
        │           MongoDB Atlas   (product data)      ◀── exists
        │                  ▲ scripts/embed-products.ts  (embed catalog)  P5
        │
        ├─▶ ChatSession / ChatMessage (chat memory)     P8
        │
        ▼
 lib/ai/openai.ts → gpt-4o-mini     (generate reply)    P1
        │  token stream
        ▼
 ChatWindow renders text + ProductCardMini  (stream display)  P2

 lib/ai/observability.ts  traces every step  (cost tracing)   P10
 tests/ai/                eval suite over the flow  (quality check)  P11
 app/api/ai/mcp/route.ts  exposes tools externally  (tool interop)   P14
 lib/ai/langchain/        re-implements the flow  (framework view)   P16
```

Principle: the API route stays thin; all AI logic lives in `lib/ai/` as
isolated, readable modules. **Each phase plugs one node into this flow.**

---

## 5. Stretch / not scheduled

Reached for after the core, depth over breadth: fine-tuning a saree-domain
model · semantic answer caching · prompt-caching cost optimization · local open
models (Ollama) · generative / streaming UI components · AI-generated lookbook
imagery · background AI jobs (auto product descriptions, review summaries).

---

## 6. How to learn from this (the workflow)

For each phase:
1. `git checkout ai-phase-N-...`
2. Read `docs/ai_docs/phase-N.md` — a short note: *what concept, why, what changed*.
3. `git diff` the phase's commit — read the actual code.
4. Run the app, use the chat bubble, watch the behaviour change vs the previous phase.
5. The commit message summarizes the concept.

---

## 7. Status

- [ ] Phase 1 — Basic chatbot
- [ ] Phase 2 — Streaming
- [ ] Phase 3 — Tool calling + structured output
- [ ] Phase 4 — Keyword RAG
- [ ] Phase 5 — Semantic RAG (embeddings + Atlas Vector Search)
- [ ] Phase 6 — Hybrid search + re-ranking
- [ ] Phase 7 — Agent
- [ ] Phase 8 — Agentic AI (memory, planning, personalization)
- [ ] Phase 9 — Guardrails
- [ ] Phase 10 — Observability
- [ ] Phase 11 — Evals
- [ ] Phase 12 — Vision / image search
- [ ] Phase 13 — Voice
- [ ] Phase 14 — MCP server
- [ ] Phase 15 — Multi-agent
- [ ] Phase 16 — LangChain

_This document is the master plan. Each phase adds its own
`docs/ai_docs/phase-N.md` learning note as it is built._
