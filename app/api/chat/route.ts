import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { prisma } from '@/lib/db'
import type { RecommendedProduct } from '@/types/chat'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const SYSTEM_PROMPT = `You are a helpful fashion assistant for Saakie, a premium saree and fashion e-commerce store in India.

Your role is to:
1. Help customers find the perfect saree based on their preferences
2. Ask clarifying questions about occasion (wedding, party, casual, festive), budget, preferred colors, material, and style
3. Provide personalized product recommendations from the available catalog
4. Answer questions about saree styling tips and fashion advice

Guidelines:
- Be warm, friendly, and conversational
- When recommending products, reference them by their exact names from the catalog
- Include product IDs in format [PRODUCT:id] so the system can show product cards
- If the user's requirements don't match any products, suggest alternatives
- Always recommend 1-3 products at most per response
- Ask follow-up questions to narrow down preferences
- Mention price in Indian Rupees (₹)

Available product attributes you can filter by: occasion, color, material, pattern, fabric, workType, price range.`

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json()

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    // Fetch products from database for context
    const products = await fetchProducts()

    // Build product context for the AI
    const productContext = buildProductContext(products)

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT + '\n\n--- PRODUCT CATALOG ---\n' + productContext
        },
        ...messages
      ],
      temperature: 0.7,
      max_tokens: 500,
    })

    const assistantMessage = completion.choices[0].message.content || ''

    // Extract product IDs from response and get full details
    const recommendedProducts = extractProductRecommendations(assistantMessage, products)

    // Clean the message (remove product ID markers)
    const cleanMessage = assistantMessage.replace(/\[PRODUCT:[^\]]+\]/g, '').trim()

    return NextResponse.json({
      message: cleanMessage,
      products: recommendedProducts
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    )
  }
}

async function fetchProducts() {
  try {
    return await prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        price: true,
        material: true,
        occasion: true,
        pattern: true,
        fabric: true,
        workType: true,
        isFeatured: true,
        colors: { select: { name: true, hexCode: true } },
        images: { select: { url: true, isPrimary: true }, take: 1 },
        category: { select: { name: true } }
      },
      take: 30,
      orderBy: [
        { isFeatured: 'desc' },
        { createdAt: 'desc' }
      ]
    })
  } catch (error) {
    console.error('Error fetching products:', error)
    return []
  }
}

function buildProductContext(products: any[]): string {
  if (products.length === 0) {
    return 'No products available in the catalog at the moment.'
  }

  return products.map(p => {
    const colors = p.colors?.map((c: any) => c.name).join(', ') || 'Various'
    const occasions = p.occasion?.join(', ') || 'Any occasion'

    return `ID: ${p.id}
Name: ${p.name}
Price: ₹${p.price.toLocaleString('en-IN')}
Category: ${p.category?.name || 'Fashion'}
Material: ${p.material || 'Premium fabric'}
Occasion: ${occasions}
Pattern: ${p.pattern || 'Classic'}
Colors: ${colors}
---`
  }).join('\n')
}

function extractProductRecommendations(message: string, products: any[]): RecommendedProduct[] {
  const productIdRegex = /\[PRODUCT:([^\]]+)\]/g
  const matches = [...message.matchAll(productIdRegex)]
  const recommendedIds = matches.map(m => m[1])

  const recommendations: RecommendedProduct[] = []

  for (const id of recommendedIds) {
    const product = products.find(p => p.id === id)
    if (product) {
      recommendations.push({
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        image: product.images?.[0]?.url || '',
        category: product.category?.name || 'Fashion'
      })
    }
  }

  return recommendations
}
