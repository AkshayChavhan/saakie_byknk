# Phase 1 — Basic LLM Chatbot

**Branch:** `ai-phase-1-chatbot`
**Concepts:** LLM API call · prompt engineering (system prompt)

---

## What this phase does

The chat UI already existed but POSTed to a `/api/chat` route that didn't
exist — so the chat bubble was dead. This phase makes it **actually talk to a
language model**.

Send a message in the chat bubble → it now gets a real reply from OpenAI's
`gpt-4o-mini`.

## What was added

| File | Role |
|---|---|
| `lib/ai/openai.ts` | OpenAI client **singleton** (same pattern as `lib/prisma.ts`) + the `CHAT_MODEL` constant. |
| `lib/ai/prompts.ts` | The **system prompt** — the assistant's role and rules. Kept in its own file because prompt engineering is its own skill. |
| `app/api/chat/route.ts` | The `POST` endpoint: validate input → prepend the system prompt → call `chat.completions` → return `{ message, products: [] }`. |

## The two concepts

### 1. An LLM API call
At its core, calling an LLM is just:

```
openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [ ...conversation ],
})
```

You send a **list of messages** (each with a `role` — `system`, `user`, or
`assistant`) and get back the model's next message. That's the whole
primitive. Everything in later phases (streaming, tools, agents) is built on
top of this one call.

### 2. The system prompt
The **first** message — `role: 'system'` — is not from the user. It is
*instructions to the model*: who it is, how to behave, what it must not do.

In `lib/ai/prompts.ts`, our system prompt makes the model a Saakie boutique
stylist, tells it to be concise, to use ₹, and — importantly — **not to invent
product names or prices**, because in Phase 1 it has no access to the real
catalogue. Changing this prompt changes the assistant's entire personality and
behaviour. That iteration *is* prompt engineering.

## The deliberate limitation

The assistant in this phase is "dumb": it knows general saree fashion but
**nothing about Saakie's actual products** — it cannot answer "show me red
silk sarees under ₹3000" with real items.

That is intentional. It is the **baseline**. Feeling this limitation is the
point — it motivates:
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

1. Run the app, open the chat bubble (bottom-right).
2. Ask: *"What saree should I wear to an evening wedding reception?"* — you get
   real styling advice.
3. Ask: *"Do you have red silk sarees under ₹3000?"* — notice it gives
   *guidance* but honestly says it can't list live products yet. That honesty
   is the system prompt working.

## Notes

- Needs `OPENAI_API_KEY` in the environment and credits on the OpenAI account.
- `MAX_HISTORY` caps how many turns are sent to the model — bounds cost/latency.
- `temperature: 0.7` — a little creative; `max_tokens: 500` — keeps replies short.
