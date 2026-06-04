# Phase 1 — Basic LLM Chatbot (Claude)

**Branch:** `ai-phase-1-claude` (re-do of `ai-phase-1-chatbot`, swapping
provider) · **Concepts:** LLM API call · prompt engineering (system prompt)
· LLM-provider portability

---

## What this phase does

The chat UI already existed but POSTed to a `/api/chat` route that didn't
exist — so the chat bubble was dead. This phase makes it **actually talk to a
language model**.

Send a message in the chat bubble → it now gets a real reply from Anthropic's
`claude-haiku-4-5`.

> **Why Claude and not OpenAI?** An earlier Phase 1 used OpenAI's
> `gpt-4o-mini`. We swapped to Anthropic Claude because Claude is a better fit
> for the agentic + MCP-heavy phases later in the curriculum (P7, P8, P14, P15),
> and learning Claude's SDK is one of the goals. This commit *is* the swap —
> reading the diff is the second lesson of Phase 1.

## What was added

| File | Role |
|---|---|
| `lib/ai/claude.ts` | Claude client **singleton** (same pattern as `lib/prisma.ts`) + the `CHAT_MODEL` constant. **Named `claude.ts` because it is Claude-only**: anything else provider-specific (OpenAI for embeddings/voice later) lives in its own file (e.g. `openai-embeddings.ts`), so it's obvious from the filename which provider any file calls. Provider-agnostic helpers keep generic names. |
| `lib/ai/prompts.ts` | The **system prompt** — the assistant's role and rules. Kept in its own file because prompt engineering is its own skill. Provider-agnostic: the *same* string works with OpenAI, Claude, or any other LLM. Generic filename for that reason. |
| `app/api/chat/route.ts` | The `POST` endpoint: validate input → call `anthropic.messages.create` with the system prompt + history → return `{ message, products: [] }`. Generic route — the chat UI doesn't need to know which provider answered. |

`lib/ai/openai.ts` was **deleted** in this commit. We'll bring back a focused
OpenAI client later, only for embeddings (Phase 5) and voice (Phase 13), since
Anthropic doesn't ship those.

## The three concepts

### 1. An LLM API call (Claude flavour)
At its core, calling Claude is just:

```ts
const response = await anthropic.messages.create({
  model: 'claude-haiku-4-5',
  max_tokens: 500,
  system: '...the system prompt...',
  messages: [
    { role: 'user', content: '...' },
    { role: 'assistant', content: '...' },
    { role: 'user', content: '...' },
  ],
});
const text = response.content[0].text;
```

You send the conversation as a list of **user/assistant turns**, plus a separate
**system instruction**, and you get back the model's next message. That's the
whole primitive — every later phase (streaming, tools, agents) builds on it.

### 2. The system prompt
The `system` field is *instructions to the model*: who it is, how to behave,
what it must not do. With Claude it lives in a **top-level field**, not inside
the `messages` array.

Our system prompt (in `lib/ai/prompts.ts`) makes the model a Saakie boutique
stylist, tells it to be concise, to use ₹, and — importantly — **not to invent
product names or prices**, because in Phase 1 it has no access to the real
catalogue. Changing this prompt changes the assistant's entire personality.
That iteration *is* prompt engineering.

### 3. LLM-provider portability — Claude vs OpenAI
The system prompt, the request/response contract, and the chat UI are all
unchanged. **Only the route file changed shape.** Differences between the two
SDKs:

| What | OpenAI | Anthropic Claude |
|---|---|---|
| SDK | `openai` | `@anthropic-ai/sdk` |
| Env var | `OPENAI_API_KEY` | `ANTHROPIC_API_KEY` |
| Method | `openai.chat.completions.create(...)` | `anthropic.messages.create(...)` |
| System prompt | First entry in `messages` with `role: 'system'` | **Top-level `system: string` field** (not in `messages`) |
| `messages` roles | `system` / `user` / `assistant` | `user` / `assistant` only |
| `max_tokens` | Optional | **Required** |
| Reply text | `completion.choices[0].message.content` | `response.content[0].text` (content is an array of blocks) |

That's it — the rest is identical. Most LLM APIs look 90% the same;
recognizing the differences is a useful production skill (multi-provider apps
are common).

## The deliberate limitation

The assistant in this phase is still "dumb": it knows general saree fashion
but **nothing about Saakie's actual products** — it cannot answer "show me red
silk sarees under ₹3000" with real items.

That's intentional — the baseline. Feeling this limitation motivates:
- **Phase 3 (tools)** — letting the model call code that queries the catalogue.
- **Phase 4–5 (RAG)** — grounding answers in real product data.

## Request / response contract

The route matches what the existing chat UI expects (`types/chat.ts`):

```
POST /api/chat
  → { messages: [{ role, content }, ...] }
  ← { message: string, products: RecommendedProduct[] }
```

`products` is always `[]` in Phase 1 — it gets filled from Phase 3 onward.

## Try it

1. Run the app (`npm run dev` on Node 22), open the chat bubble (bottom-right).
2. Ask: *"What saree should I wear to an evening wedding reception?"* — real
   styling advice.
3. Ask: *"Do you have red silk sarees under ₹3000?"* — notice it gives
   *guidance* but honestly says it can't list live products yet. The system
   prompt is doing its job.
4. Ask something off-topic, e.g. *"What's the weather today?"* — it politely
   redirects to sarees / styling.

## Notes

- Needs `ANTHROPIC_API_KEY` in the environment and **prepaid credit** on the
  Anthropic account (Console → Plans & Billing). A new account starts at $0;
  ~US$5 is plenty for hundreds of Haiku 4.5 chats.
- `MAX_HISTORY` caps how many turns are sent to the model — bounds cost/latency.
- `temperature: 0.7` — a little creative; `max_tokens: 500` — keeps replies short.
- `lib/ai/openai.ts` returns in a later phase as a small embeddings-only client.
