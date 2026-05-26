User types "What saree for an evening wedding reception?" in the chat bubble
  │
  ▼
components/chat/chat-window.tsx → sendMessage()
  │
  │  WHY send the whole history:
  │    LLMs are stateless — Claude has no memory between requests. Every
  │    call is a blank slate, so the client replays the full transcript
  │    each time. The seeded greeting is part of it, so Claude knows
  │    what it just said.
  │
  │  POST /api/chat
  │  Content-Type: application/json
  │  Body:
  │    {
  │      "messages": [
  │        // index 0 — UI's hardcoded opener. role="assistant" because,
  │        // from Claude's perspective, the bot said it.
  │        { "role": "assistant",
  │          "content": "Hello! I'm your personal fashion assistant..." },
  │
  │        // index 1 — what the user just typed.
  │        { "role": "user",
  │          "content": "What saree for an evening wedding reception?" }
  │      ]
  │    }
  │
  │  As the chat grows: [assistant, user, assistant, user, ...]
  │  Turn N+1 sends turns 0..N.
  ▼
app/api/chat/route.ts → POST handler
  │  1. Parse JSON body, pull out `messages`.
  │  2. Validate: must be a non-empty array (else 400).
  │  3. Filter to only user/assistant turns with non-empty string content
  │     (drops nulls, empty strings, stray roles).
  │
  │  4. Slice last 12 (MAX_HISTORY = 12) — bounds cost / latency
  │  ────────────────────────────────────────────────────────────
  │     A 50-turn chat would replay all 50 turns to Claude every request.
  │       • COST    — Claude bills per input token; every replayed turn
  │                   is billed again on every new request.
  │       • LATENCY — More input tokens = longer before the first reply
  │                   token comes out.
  │       • CONTEXT — Each model has a max context window; 12 stays
  │                   comfortably inside it forever.
  │     `.slice(-12)` keeps only the most recent 12 — where the relevant
  │     context almost always lives. Older turns are silently dropped
  │     from this request.
  │     Trade-off: Claude "forgets" anything before turn N-12. Fine for
  │     simple shop chat. Phase 8 (agentic memory) will replace this with
  │     persisted ChatSession rows + smarter retrieval.
  │
  │  5. Map to Claude's API shape:  [{ role, content }, ...]
  │  ────────────────────────────────────────────────────────────
  │     The browser attaches UI-only fields (`id`, `timestamp`, sometimes
  │     `products[]`). Claude's API only accepts `{ role, content }` per
  │     message — extras are rejected.
  │       history = filtered.slice(-12).map(m => ({
  │         role:    m.role,     // "user" | "assistant"
  │         content: m.content,  // plain string
  │       }))
  │     Result:
  │       [
  │         { role: "assistant", content: "Hello! ..." },
  │         { role: "user",      content: "What saree for ..." }
  │       ]
  │     Note: NO `{role:"system", ...}` entry — Claude takes the system
  │     prompt as a separate top-level field (next step).
  ▼
lib/ai/claude.ts → anthropic.messages.create({
    model:       "claude-haiku-4-5",
    max_tokens:  500,         // hard cap on reply length (required by Claude API)
    temperature: 0.7,         // some variety without going wild
    system:      FASHION_ASSISTANT_SYSTEM_PROMPT,   // ← top-level, NOT in messages
    messages:    history                            // ← user/assistant turns only
  })
  │
  │  system prompt (abridged, from lib/ai/prompts.ts):
  │    "You are a friendly fashion stylist for Saakie, a premium saree boutique.
  │     - Use ₹ for prices
  │     - Don't invent product names, prices, or stock
  │     - If asked for live catalogue info, say you can't see it yet
  │     - Stay on topic: sarees, styling, occasions..."
  ▼
Anthropic API → generates reply, returns:
  {
    content: [ { type: "text", text: "For an evening reception, a..." } ],
    stop_reason: "end_turn",
    usage:       { input_tokens: 142, output_tokens: 88 },
    ...
  }
  │
  │  Note: `content` is an ARRAY of blocks. Phase 1 only has one text
  │  block. Later phases will see `tool_use` blocks (Phase 3) and
  │  `thinking` blocks here too.
  ▼
route.ts → extract first text block, build JSON response:
  const textBlock = response.content.find(b => b.type === "text")
  const message   = (textBlock && "text" in textBlock ? textBlock.text : "").trim()
                    || "Sorry, I couldn't generate a reply."
  │
  │  Respond:
  │    { "message": "For an evening reception, a...",
  │      "products": [] }
  │
  │  Why products: []  →  Claude has NO database access in Phase 1.
  │  The shape is reserved for Phase 3 (tool calling), when the model
  │  will be able to query real products and fill this array.
  ▼
ChatWindow.sendMessage() → on response:
  setMessages(prev => [...prev, {
    id: ..., role: "assistant",
    content: data.message,
    products: data.products  // empty in Phase 1
  }])
  │
  ▼
User sees the reply appear — all at once, after Claude finishes writing
(Phase 2 makes this stream token-by-token).
