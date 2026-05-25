User types "What saree for an evening wedding reception?" in the chat bubble
  │
  ▼
components/chat/chat-window.tsx → sendMessage()
  │
  │  1. Build the user message + a SEEDED EMPTY assistant message
  │  ──────────────────────────────────────────────────────────────
  │     New in Phase 2: before the network call even fires, we insert
  │     two messages into React state:
  │       userMessage      → { role: "user",      content: "What saree..." }
  │       assistantSeed    → { role: "assistant", content: "" }   ← empty!
  │     We remember the assistantSeed's id (assistantId). Each streamed
  │     chunk will append to THIS message — that's how the user sees
  │     it "type itself out" instead of all-at-once.
  │
  │  2. POST /api/chat
  │     Content-Type: application/json
  │     Body (same shape as Phase 1 — whole history, no UI-only fields):
  │       {
  │         "messages": [
  │           { "role": "assistant", "content": "Hello! I'm your..." },
  │           { "role": "user",      "content": "What saree for ..." }
  │         ]
  │       }
  │     Note: the seeded empty assistant message is NOT sent — it has
  │     content: "" so the route's filter would drop it anyway.
  ▼
app/api/chat/route.ts → POST handler
  │  1. Parse JSON body → `messages`
  │  2. Validate non-empty array (else 400)
  │  3. Filter to user/assistant turns with non-empty string content
  │  4. Slice last 12 (MAX_HISTORY) → bounds cost / latency
  │  5. Map to Claude shape: [{ role, content }, ...]
  │     (steps 1–5 are unchanged from Phase 1 — streaming is a
  │      transport change, not a prompt or validation change)
  │
  │  6. Call the SDK's streaming helper
  │  ──────────────────────────────────────────────────────────────
  │     const claudeStream = anthropic.messages.stream({
  │       model:       "claude-haiku-4-5",
  │       max_tokens:  500,
  │       temperature: 0.7,
  │       system:      FASHION_ASSISTANT_SYSTEM_PROMPT,
  │       messages:    history,
  │     })
  │
  │     `.stream()` (vs `.create()`) returns an async iterator. We can
  │     `for await` over it and it yields EVENTS as Claude emits them,
  │     not a single finished response.
  │
  │     Event types we see (most are bookkeeping — we ignore them):
  │       message_start            ─ "I'm starting"
  │       content_block_start      ─ "starting a text block"
  │       content_block_delta      ─ { type: "text_delta",
  │                                    delta: { text: "For " } }   ← keep!
  │       content_block_delta      ─ { delta: { text: "an evening " } }
  │       content_block_delta      ─ { delta: { text: "reception, " } }
  │       ... many more deltas ...
  │       content_block_stop
  │       message_delta            ─ usage update
  │       message_stop             ─ "I'm done"
  │
  │     Only `content_block_delta` with a `text_delta` payload carries
  │     the actual reply tokens. Phase 3 will care about `tool_use`
  │     deltas here too.
  │
  │  7. Wrap the iterator in a Web ReadableStream
  │  ──────────────────────────────────────────────────────────────
  │     const encoder = new TextEncoder()
  │     const stream = new ReadableStream({
  │       async start(controller) {
  │         try {
  │           for await (const event of claudeStream) {
  │             if (event.type === "content_block_delta" &&
  │                 event.delta.type === "text_delta") {
  │               controller.enqueue(encoder.encode(event.delta.text))
  │             }
  │           }
  │           controller.close()
  │         } catch (err) {
  │           // mid-stream error: surface a short message, close cleanly
  │           controller.enqueue(encoder.encode(
  │             "\n\n[The assistant ran into an error. Please try again.]"
  │           ))
  │           controller.close()
  │         }
  │       },
  │       cancel() {
  │         // ← client closed the connection (tab closed, navigated away)
  │         claudeStream.abort()  // stop paying for tokens nobody sees
  │       },
  │     })
  │
  │     Two important details:
  │       • `controller.enqueue` takes BYTES, not strings — TextEncoder
  │         converts each text delta to UTF-8 bytes before enqueuing.
  │       • Errors mid-stream don't reject the route's Response promise
  │         (it already resolved when we returned the stream). We have
  │         to handle them inside `start` and close gracefully, or the
  │         browser will hang.
  │
  │  8. Return the stream as the HTTP response
  │  ──────────────────────────────────────────────────────────────
  │     return new Response(stream, {
  │       headers: {
  │         "Content-Type":      "text/plain; charset=utf-8",
  │         "Cache-Control":     "no-cache, no-transform",
  │         "X-Accel-Buffering": "no",
  │       },
  │     })
  │
  │     Why these headers:
  │       • text/plain — simplest streaming format. Just the tokens,
  │         concatenated. NOT SSE (`data: ...\n\n`) — that's protocol
  │         overhead we don't need yet. Phase 6 switches to SSE once
  │         the agent streams multiple event TYPES on one connection.
  │       • no-cache, no-transform + X-Accel-Buffering: no — tell
  │         proxies/CDNs not to buffer. Without these, intermediaries
  │         can hold tokens until they have a "complete" chunk and
  │         defeat the streaming entirely.
  ▼
HTTP response starts flowing to the browser the moment the FIRST byte
is enqueued — typically a few hundred ms after submit, NOT after Claude
finishes (~2–4 s).
  ▼
components/chat/chat-window.tsx → reads response.body
  │  9. Get a reader on the body stream
  │  ──────────────────────────────────────────────────────────────
  │     const reader  = response.body.getReader()
  │     const decoder = new TextDecoder()
  │     let received     = ""
  │     let gotFirstChunk = false
  │
  │  10. Loop: read chunk → decode → append → re-render
  │  ──────────────────────────────────────────────────────────────
  │     while (true) {
  │       const { value, done } = await reader.read()
  │       if (done) break                             // server closed stream
  │       const chunk = decoder.decode(value, { stream: true })
  │       if (!chunk) continue
  │       received += chunk
  │
  │       // first chunk arrived → hide the "Thinking…" indicator;
  │       // the message itself is now visibly streaming.
  │       if (!gotFirstChunk) {
  │         gotFirstChunk = true
  │         setIsLoading(false)
  │       }
  │
  │       // grow the seeded assistant message's `content`
  │       setMessages(prev =>
  │         prev.map(m =>
  │           m.id === assistantId ? { ...m, content: received } : m
  │         )
  │       )
  │     }
  │
  │     Why `{ stream: true }` on decode:
  │       UTF-8 characters can be split across byte chunks (a 3-byte
  │       character could arrive 2 bytes in chunk A, 1 byte in chunk B).
  │       `{ stream: true }` tells the decoder to BUFFER incomplete
  │       sequences instead of emitting a replacement character.
  │
  │     Why setMessages on EVERY chunk:
  │       React re-renders on each `setState`. So each delta causes a
  │       re-render with the message's `content` slightly longer —
  │       that's the "typing" effect. Cheap because we only touch one
  │       message and React's diffing is fast.
  │
  │  11. Edge cases
  │  ──────────────────────────────────────────────────────────────
  │     • If `received` is still "" after the loop ends, replace the
  │       seed with a friendly fallback message.
  │     • If the fetch throws (network error), the catch block replaces
  │       the seed with an apology — the user never sees the empty
  │       message linger.
  │     • If the user closes the chat / navigates away mid-stream,
  │       fetch's underlying connection closes → the SERVER side fires
  │       `cancel()` → `claudeStream.abort()` → Anthropic stops
  │       generating, we stop being billed.
  ▼
User sees the reply appear word-by-word in real time
  (and the input is re-enabled as soon as the first token arrives, not
   when Claude finishes writing)
