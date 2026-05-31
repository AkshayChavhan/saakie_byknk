# Phase 3 — Tool Calling

**Branch:** `ai-phase-3-tools` (off `ai-phase-2-streaming`)
**Concepts:** function/tool calling · agent loop (decide → execute → observe)
· Zod schemas as a single source of truth · structured data over a text stream

---

## What this phase does

Phases 1 and 2 gave the assistant a voice but no eyes. It could talk about
sarees in general terms, but it had no way to *see* the real catalogue, so
the system prompt forced it to be honest: *"I cannot list specific live
products yet."* The `products[]` array on every reply was empty.

Phase 3 gives it eyes. Claude now has three tools that hit the live Prisma
DB; it decides when to call them, the route runs them, and real products
stream back to the UI as `ProductCardMini` cards under the assistant's reply.

Same chat window, same streaming, much more useful answers.

## What changed

| File | What |
|---|---|
| `lib/ai/tools.ts` | **New.** Three tools (`searchProducts`, `getProductDetails`, `getCategories`) with Zod schemas, JSON-Schema generation, and Prisma-backed handlers. |
| `app/api/chat/route.ts` | Wraps a **tool-call loop** inside the existing `ReadableStream`. After the loop, appends a `\n\n[[PRODUCTS]]{...}` sentinel + JSON if any tool surfaced products. |
| `lib/ai/prompts.ts` | System prompt now tells the model *when* to reach for each tool, and how to talk about the results (no more "I can't see products" disclaimer). |
| `components/chat/chat-window.tsx` | Read loop now splits on the `[[PRODUCTS]]` sentinel: visible text → `message.content`, parsed JSON → `message.products[]`. The existing `ProductCardMini` block renders them. |
| `package.json` | Adds `zod` (v4). |

`lib/ai/claude.ts`, `types/chat.ts`, and `components/chat/product-card-mini.tsx`
are unchanged — the tools were built to fit the existing `RecommendedProduct`
shape, so the UI stayed exactly as it was.

## The four concepts

### 1. The tool definition

A "tool" is just a function description Claude can read, plus a function on
our server that runs when the model picks it. The SDK takes the description
shape:

```ts
{
  name: 'searchProducts',
  description: 'Search the live saree catalogue by ...',
  input_schema: { /* JSON Schema for the args */ },
}
```

Notice **no implementation** is sent. Claude never executes code — it just
*declares the call it wants made*, and we do the running.

### 2. Zod as the single source of truth

The `description` strings tell the model what each tool does. The
`input_schema` tells it what to pass. The handler needs *types* to write
safe code. Three different surfaces, easy to drift apart.

So we author each tool's args once, in Zod:

```ts
const SearchProductsInput = z.object({
  query: z.string().optional().describe('Free-text search across name, ...'),
  categorySlug: z.string().optional().describe('Use a slug like "silk-..."'),
  // ...
})
```

Then we derive everything from it:

- The **JSON Schema** Claude reads — via `z.toJSONSchema(SearchProductsInput)`.
  The `.describe()` calls become `"description"` fields inside the schema, so
  per-argument hints reach the model.
- The **runtime validator** — `SearchProductsInput.parse(rawInput)` inside the
  handler. If Claude sends something malformed, this throws, the route
  catches it, and we return `{ error: '…' }` as the tool result so the model
  can recover (it usually retries with corrected args).
- The **TypeScript type** in the handler body — `z.infer<typeof SearchProductsInput>`
  if we wanted to name it; usually we just let `.parse()` give us a typed value.

One file edit, three downstream sources stay in sync.

### 3. The agent loop

This is the loop in [`app/api/chat/route.ts`](../../app/api/chat/route.ts).
Pseudocode:

```
conversation = [...userHistory]
loop up to 4 times:
  stream  = anthropic.messages.stream({ ..., tools, messages: conversation })
  for each event from stream:
    if event is a text_delta:
      enqueue to the browser stream     ← user sees tokens live
  final   = await stream.finalMessage()
  if final.stop_reason !== 'tool_use':
    break                                ← model gave the user-facing answer
  for each tool_use block in final.content:
    output = await handler(block.input)
    push { type:'tool_result', tool_use_id: block.id, content: stringify(output) }
  conversation.push(final.content as assistant turn)
  conversation.push(tool_results as user turn)
```

Four things worth pinning:

- **Claude streams text *and* tool_use in the same response.** When the model
  wants a tool, it usually emits a short reasoning sentence first ("Let me
  check our catalogue…") and *then* the tool_use block. The reasoning text
  is streamed to the user; the tool_use block is collected from
  `finalMessage()` once the turn ends.
- **The cap (`MAX_TOOL_ITERATIONS = 4`).** Without it, a confused model
  could loop forever. Phase 7 (`Agent`) makes this configurable and
  user-visible ("Searching catalog… got results… answering"). For Phase 3,
  4 is plenty — almost every chat needs 1, occasionally 2.
- **Tool errors don't crash the loop.** We catch handler exceptions, return
  `{ error: '…', is_error: true }` as the tool_result, and let Claude
  apologise / re-plan.
- **`cancel()` still works.** The route tracks the *currently active*
  upstream stream so a tab close mid-iteration aborts the right one.

### 4. Streaming structured data over a text stream

Phase 2's transport is `Content-Type: text/plain` — perfect for tokens,
useless for arrays. We get around it with a sentinel:

```
<streamed advice tokens…>\n\n[[PRODUCTS]]{"products":[ ... ]}
```

The route enqueues the sentinel + JSON payload as the *final* write before
closing. The browser:

1. Watches `received` for the sentinel.
2. Once found, `message.content` becomes everything *before* it.
3. The payload after it is parsed with `JSON.parse` (guarded by try/catch
   because it might arrive split across chunks).
4. `message.products[]` is set; the existing `ProductCardMini` block renders.

This is intentionally a hack — the right primitive for "stream of mixed
event types" is **SSE** (`text/event-stream` with `event: token`,
`event: products`, `event: status`). Phase 6 makes that upgrade once the
agent has more types of things to emit. For now, one sentinel is enough.

## Trade-off: tool calling vs RAG

Phase 3 lets the **model decide** when to fetch data. Phase 4 introduces
**RAG**, where we always fetch context up-front and inject it into the
prompt whether the model wanted it or not. Both ship products to users;
neither is "better":

| | Tool calling (Phase 3) | RAG (Phase 4+) |
|---|---|---|
| Who decides what to retrieve? | The model | The server (always retrieves) |
| Round-trips per request | 1 + N tool turns | 1 |
| Best for | Branching catalogue queries; "more about X" follow-ups | Q&A where context is always relevant |
| Token cost | Higher (tool defs + intermediate turns) | Lower per request |
| Latency | Higher (extra Claude turns) | Lower |
| Hallucination risk | Low (tools return real rows) | Low if context is faithful |

Real production systems usually mix both — RAG for the obviously-relevant
context, tools for actions the model decides to take. The agent in Phase 7
will compose them.

## What you'll see vs Phase 2

| | Phase 2 | Phase 3 |
|---|---|---|
| "Show me red silk sarees under ₹5000" | Polite refusal + general advice | Streamed advice **+ real product cards** |
| "Tell me more about <slug>" | "I can't see live products yet…" | Full details streamed from the DB |
| "What kinds of sarees do you have?" | Lists generic categories from memory | Calls `getCategories()`, reports real shop categories |
| Off-topic ("the weather?") | Polite redirect | Polite redirect (system prompt still enforces scope) |
| Round-trips per chat | 1 stream | 1–4 streams (most chats: 2) |

## Try it

1. Run the app (`npm run dev` on Node 22), open the chat bubble.
2. Ask: *"Show me silk sarees under ₹5000."* The advice streams in; once the
   model finishes, product cards appear under the message. Each card's
   slug should match a real product on the site.
3. Ask: *"Tell me more about <one of those slugs>."* Expect a detail-driven
   reply (material, occasion, stock).
4. Ask: *"What categories do you have?"* Expect a short listing pulled from
   `getCategories()`.
5. Empty DB? The model says so honestly — no inventions. (`chore/db-seed-fake-data`
   is the branch that seeds realistic data if you need it.)

## Notes / what's next

- Same `ANTHROPIC_API_KEY` and credit as Phase 2 — token usage is higher per
  chat because the tool definitions + tool results travel as input tokens
  on every iteration.
- Phase 4 (keyword RAG) is the next phase. We'll add `lib/ai/retrieval.ts`
  that fetches a compact context block *up-front* and injects it into the
  prompt, rather than letting the model pull data.
- Phase 6 will replace this sentinel transport with **SSE** once the agent
  needs structured events (`status: searching`, `tool: searchProducts`,
  `result: …`, `text: …`).
- Phase 7 will hoist this loop into a real `Agent` class with planning, more
  tools, and a visible "agent thinking" UI.
