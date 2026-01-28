# AI Chatbot - Technical Design Document

## Overview

This document describes the implementation of an AI-powered product recommendation chatbot for the Saakie e-commerce platform. The chatbot uses OpenAI's GPT-4o-mini model to provide intelligent, conversational product recommendations to visitors.

---

## Table of Contents

1. [Architecture](#architecture)
2. [File Structure](#file-structure)
3. [How It Works](#how-it-works)
4. [Setup Guide](#setup-guide)
5. [Usage Guide](#usage-guide)
6. [Technical Complexity](#technical-complexity)
7. [Customization](#customization)
8. [Troubleshooting](#troubleshooting)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Interface                            │
│  ┌─────────────┐    ┌──────────────────────────────────────┐   │
│  │ ChatBubble  │───▶│           ChatWindow                  │   │
│  │ (Floating)  │    │  ┌────────────┐  ┌────────────────┐  │   │
│  └─────────────┘    │  │ChatMessage │  │ProductCardMini │  │   │
│                     │  └────────────┘  └────────────────┘  │   │
│                     └──────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ HTTP POST /api/chat
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API Layer                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   /api/chat/route.ts                      │  │
│  │  1. Receive messages                                      │  │
│  │  2. Fetch products from database                          │  │
│  │  3. Build context for AI                                  │  │
│  │  4. Call OpenAI API                                       │  │
│  │  5. Extract product recommendations                       │  │
│  │  6. Return response with products                         │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
          ┌─────────────────┐     ┌─────────────────┐
          │   MongoDB       │     │   OpenAI API    │
          │   (Products)    │     │   (GPT-4o-mini) │
          └─────────────────┘     └─────────────────┘
```

---

## File Structure

```
saree-shop/
├── app/
│   └── api/
│       └── chat/
│           └── route.ts          # API endpoint for chat
├── components/
│   └── chat/
│       ├── index.ts              # Barrel exports
│       ├── chat-bubble.tsx       # Floating chat button
│       ├── chat-window.tsx       # Main chat interface
│       ├── chat-message.tsx      # Individual message component
│       └── product-card-mini.tsx # Product recommendation card
├── types/
│   └── chat.ts                   # TypeScript interfaces
└── components/
    └── providers.tsx             # Global provider (includes ChatBubble)
```

---

## How It Works

### Step 1: User Opens Chat
- User clicks the floating chat bubble (bottom-right corner)
- `ChatBubble` component toggles `ChatWindow` visibility
- Initial greeting message is displayed

### Step 2: User Sends Message
- User types a message (e.g., "I need a red silk saree for a wedding")
- Message is added to local state and displayed immediately
- Loading indicator appears

### Step 3: API Request
- Frontend sends POST request to `/api/chat` with message history
- API fetches up to 30 active products from MongoDB via Prisma
- Products are formatted into a text context for the AI

### Step 4: OpenAI Processing
- System prompt defines the AI's personality and guidelines
- Product catalog is appended to the system prompt
- OpenAI processes the conversation and generates a response
- AI includes `[PRODUCT:id]` markers for recommendations

### Step 5: Response Processing
- API extracts product IDs from the AI response
- Product details are fetched and formatted
- Clean message (without markers) and products are returned

### Step 6: Display Results
- Assistant message appears in chat
- Recommended products display as clickable cards
- User can click products to view full details

---

## Setup Guide

### Prerequisites
- Node.js 18+ installed
- MongoDB database connected
- OpenAI API account

### Step 1: Install Dependencies
```bash
npm install openai
```

### Step 2: Configure Environment
Add to `.env` file:
```env
OPENAI_API_KEY=sk-your-openai-api-key-here
```

### Step 3: Verify Files Exist
Ensure all chat components are in place:
- `app/api/chat/route.ts`
- `components/chat/*.tsx`
- `types/chat.ts`

### Step 4: Restart Development Server
```bash
npm run dev
```

### Step 5: Test the Chatbot
1. Open http://localhost:3001
2. Click the chat bubble (bottom-right)
3. Ask for product recommendations

---

## Usage Guide

### For End Users

**Opening the Chat:**
- Click the black circular button in the bottom-right corner
- The chat window will slide up

**Asking Questions:**
- Type your question in the input field
- Press Enter or click the send button
- Examples:
  - "I'm looking for a wedding saree"
  - "Show me silk sarees under 10000"
  - "What do you recommend for a party?"

**Using Quick Prompts:**
- Click pre-defined buttons like "Wedding sarees" or "Under ₹5000"
- These provide quick starting points

**Viewing Products:**
- Recommended products appear as cards below the AI response
- Click any product to view its full details page

**Closing the Chat:**
- Click the X button in the header
- Or click the chat bubble again

### For Developers

**Adding New Quick Prompts:**
Edit `components/chat/chat-window.tsx`:
```typescript
const QUICK_PROMPTS = [
  'Wedding sarees',
  'Casual wear',
  'Under ₹5000',
  'Silk sarees',
  'Party wear'  // Add new prompt
]
```

**Modifying AI Behavior:**
Edit the `SYSTEM_PROMPT` in `app/api/chat/route.ts` to change:
- AI personality and tone
- Product recommendation guidelines
- Response format

**Changing Product Limit:**
In `app/api/chat/route.ts`, modify the `take` parameter:
```typescript
return await prisma.product.findMany({
  // ...
  take: 30,  // Change this number
})
```

---

## Technical Complexity

### Component Complexity

| Component | Complexity | Description |
|-----------|------------|-------------|
| `chat-bubble.tsx` | Low | Simple toggle button with state |
| `chat-message.tsx` | Low | Stateless display component |
| `product-card-mini.tsx` | Low | Stateless with Next.js Image |
| `chat-window.tsx` | Medium | State management, API calls, auto-scroll |
| `route.ts` | High | Database queries, OpenAI integration, parsing |

### Key Technical Decisions

#### 1. Model Selection: GPT-4o-mini
- **Why:** Cost-effective ($0.15/1M input tokens) while maintaining quality
- **Trade-off:** Slightly less capable than GPT-4 but 10x cheaper
- **Alternative:** Use `gpt-4o` for higher quality at higher cost

#### 2. Context Window Management
- **Approach:** Limit to 30 products in context
- **Why:** Balances comprehensive catalog coverage with token limits
- **Trade-off:** May miss some products; prioritizes featured items

#### 3. State Management: Local useState
- **Why:** Chat is self-contained, no need for global state
- **Trade-off:** Chat history resets on page navigation
- **Alternative:** Use localStorage or database for persistence

#### 4. Product Recommendation Extraction
- **Approach:** AI includes `[PRODUCT:id]` markers in response
- **Why:** Reliable extraction without complex NLP parsing
- **Trade-off:** Requires AI to follow format consistently

### Performance Considerations

| Aspect | Implementation | Impact |
|--------|----------------|--------|
| Initial Load | Component lazy-loaded | ~5KB additional JS |
| API Latency | GPT-4o-mini ~1-3s | Acceptable for chat |
| Database Query | Single query, 30 products | ~50-100ms |
| Rendering | React virtualization not needed | Chat history typically <50 messages |

### Security Measures

1. **API Key Protection:** OpenAI key stored server-side only
2. **Input Sanitization:** Messages sent as plain text
3. **Rate Limiting:** Consider adding for production
4. **Error Handling:** Graceful fallbacks for API failures

---

## Customization

### Styling the Chat Bubble
Edit `components/chat/chat-bubble.tsx`:
```typescript
// Change color
'bg-gray-900'  →  'bg-primary' or 'bg-blue-600'

// Change size
'w-14 h-14'  →  'w-16 h-16'

// Change position
'bottom-6 right-6'  →  'bottom-8 right-8'
```

### Styling the Chat Window
Edit `components/chat/chat-window.tsx`:
```typescript
// Change dimensions
'w-[380px]'  →  'w-[420px]'
'h-[520px]'  →  'h-[600px]'

// Change header color
'bg-gray-900'  →  'bg-primary'
```

### Customizing AI Personality
Edit `SYSTEM_PROMPT` in `app/api/chat/route.ts`:
```typescript
const SYSTEM_PROMPT = `You are [NAME], a [PERSONALITY] fashion assistant...

Your communication style:
- [TONE GUIDELINES]
- [LANGUAGE PREFERENCES]
- [CULTURAL CONSIDERATIONS]
`
```

---

## Troubleshooting

### Chat bubble not appearing
1. Check browser console for errors
2. Verify `ChatBubble` is in `providers.tsx`
3. Restart the development server

### "OpenAI API key not configured" error
1. Ensure `OPENAI_API_KEY` is in `.env`
2. Restart the server after adding the key
3. Verify key is valid at platform.openai.com

### Products not showing in recommendations
1. Check database connection
2. Verify products have `isActive: true`
3. Check API logs for errors

### Slow response times
1. OpenAI API can take 1-3 seconds
2. Consider reducing product context size
3. Check network connectivity

### Chat window positioning issues
1. Ensure z-index (50) is higher than other elements
2. Check for CSS conflicts with fixed positioning
3. Test on different screen sizes

---

## Future Enhancements

1. **Chat History Persistence:** Save conversations to localStorage or database
2. **User Context:** Integrate with Clerk to personalize based on user history
3. **Image Upload:** Allow users to upload reference images
4. **Voice Input:** Add speech-to-text capability
5. **Multi-language:** Support for Hindi and regional languages
6. **Analytics:** Track popular queries and conversion rates
7. **Offline Mode:** Cache recent conversations for offline viewing

---

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| openai | ^4.x | OpenAI API client |
| @prisma/client | ^6.x | Database ORM |
| lucide-react | ^0.525 | Icons (MessageCircle, Send, etc.) |
| tailwindcss | ^3.4 | Styling |

---

## API Reference

### POST /api/chat

**Request:**
```json
{
  "messages": [
    { "role": "user", "content": "I need a wedding saree" },
    { "role": "assistant", "content": "..." },
    { "role": "user", "content": "Something in red" }
  ]
}
```

**Response:**
```json
{
  "message": "I have some beautiful red wedding sarees for you...",
  "products": [
    {
      "id": "abc123",
      "name": "Royal Red Banarasi Silk",
      "slug": "royal-red-banarasi-silk",
      "price": 15000,
      "image": "https://...",
      "category": "Wedding Sarees"
    }
  ]
}
```

**Error Response:**
```json
{
  "error": "Failed to process chat request"
}
```

---

## Contact

For questions or issues with the chatbot implementation, refer to the main project documentation or contact the development team.
