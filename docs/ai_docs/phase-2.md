# Phase 2 — Streaming Responses

**Branch:** `ai-phase-2-streaming` (off `ai-phase-1-claude`)
**Concepts:** streaming UX · async iterators · `ReadableStream` · Web Streams API
· cancellation propagation

---

## What this phase does

Phase 1 only returned the reply after Claude *finished* writing it. For a
3-sentence styling answer that's ~2–4 seconds of "Thinking…" staring at the
user, then everything appears at once.

This phase makes the reply **stream**: tokens appear one-by-one as Claude
emits them — the familiar "ChatGPT typing" effect. Time-to-first-byte drops
from "wait for the whole answer" to "a few hundred milliseconds."

Nothing else about the assistant's behaviour changes. Same model, same
system prompt, same answers — just delivered live.

## What changed

| File | What |
|---|---|
| `app/api/chat/route.ts` | Switched from `messages.create` (one-shot) to `messages.stream` (async iterator of events). Returns a `ReadableStream` with `Content-Type: text/plain; charset=utf-8` instead of JSON. |
| `components/chat/chat-window.tsx` | Inserts an empty assistant message first, then reads `response.body` with a `ReadableStreamDefaultReader` + `TextDecoder` and appends each chunk to that message as it arrives. |

`lib/ai/claude.ts` and `lib/ai/prompts.ts` are unchanged — streaming is a
*transport* change, not a model or prompt change.

## The three concepts

### 1. The SDK's streaming iterator
Claude's SDK exposes `messages.stream({...})` which returns an object you can
`for await` over. It yields events as Claude emits them:

```ts
for await (const event of anthropic.messages.stream({...})) {
  if (event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta') {
    // event.delta.text is the next chunk of text
  }
}
```

Most events are bookkeeping (`message_start`, `content_block_start`, …). The
only event Phase 2 cares about is `content_block_delta` with a `text_delta`
payload — those are the actual reply tokens. Later phases will care about
`tool_use` deltas (Phase 3+) and `thinking` deltas.

### 2. Returning a `ReadableStream` from a route
A Next.js route handler can return a `Response` whose body is a Web
`ReadableStream`. Inside the stream's `start()`, we run the async iterator
and `controller.enqueue(...)` each text delta — encoded with `TextEncoder`
since streams transport bytes, not strings. When the loop ends we
`controller.close()`. If something throws, we surface a short failure
message and close cleanly so the browser doesn't hang.

The headers matter:
- `Content-Type: text/plain; charset=utf-8` — the simplest possible streaming
  format. Just the tokens, concatenated. Not SSE (`data: …\n\n` framing) —
  that's protocol overhead we don't need yet. Phase 6 will switch to SSE
  once the agent needs to stream structured events ("thinking",
  "calling tool X", "got result", "final answer").
- `Cache-Control: no-cache, no-transform` and `X-Accel-Buffering: no` — tell
  proxies/CDNs not to buffer the response. Without these, intermediaries can
  hold tokens until they have a "complete" chunk, defeating streaming.

### 3. Reading a stream in the browser
The fetch `Response.body` is a `ReadableStream<Uint8Array>`. We read it like:

```ts
const reader = response.body!.getReader()
const decoder = new TextDecoder()
let received = ''
while (true) {
  const { value, done } = await reader.read()
  if (done) break
  received += decoder.decode(value, { stream: true })
  // re-render the assistant message with `received` so far
}
```

`{ stream: true }` matters — it tells the decoder that bytes might be split
mid-character across chunks, so it should buffer rather than emit a
replacement character.

The React side is the same trick as any optimistic UI: insert the empty
assistant message immediately, then `setMessages(prev => prev.map(...))`
each loop iteration to keep growing its `content`. React re-renders on
each `setState` and the user sees tokens appear in real time.

### 4. Cancellation
A stream you return from a route also receives a `cancel()` callback if the
client closes the connection (closed the tab, navigated away, hit stop).
We call `claudeStream.abort()` there so Anthropic stops generating — and
stops billing — for tokens nobody will see. Small detail, real money at
scale.

## Trade-off: the response shape changed

Phase 1 returned `{ message, products }` JSON. Phase 2 returns **plain
streamed text** — there's no JSON envelope to put `products[]` in anymore.

That's deliberate. Phase 3 (tool calling) will reintroduce structured product
recommendations as a **trailing JSON event** appended to the stream, e.g.:

```
...streaming text...
\n\n[[PRODUCTS]]{"products":[{...},{...}]}
```

For Phase 2, the `products` array is simply gone. The chat UI's
`ProductCardMini` rendering still works — there just isn't anything to render
yet (still Phase 1's "no real catalogue access" baseline, plus streaming).

## What you'll see vs Phase 1

| | Phase 1 | Phase 2 |
|---|---|---|
| When first text appears | After the model finishes (≈ 2–4 s) | A few hundred ms after submit |
| "Thinking…" indicator | Visible until reply arrives | Visible until first token |
| Feel | Like waiting for a page to load | Like watching someone type |
| Server CPU | Identical | Identical |
| Tokens billed | Identical | Identical |

The actual answer text is the same — just *paced* differently. Streaming is
purely a UX win.

## Try it

1. Run the app (`npm run dev` on Node 22), open the chat bubble.
2. Ask: *"What saree should I wear to an evening wedding reception?"* — you
   should see the reply *type itself out* word-by-word, not appear all at once.
3. Halfway through a long reply, close the chat panel. Look at the dev
   server's terminal: you'll see the `cancel()` path fire (no error). The
   Claude request is aborted upstream, saving the remaining tokens.

## Notes / what's next

- Same `ANTHROPIC_API_KEY` and credit as Phase 1 — streaming costs the same
  per token.
- Phase 3 (tool calling) is the next phase. Then `products[]` returns —
  served as a trailing JSON event in the same stream.
- Phase 6 will upgrade this transport to **SSE** to stream structured
  agent events ("planning…", "searching catalog…", "got 5 results", final answer).
