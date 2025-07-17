import { NextResponse } from 'next/server'

// Simple in-memory store (use Redis/database in production)
const webhookLogs: Array<{
  id: string
  timestamp: string
  eventType: string
  status: 'success' | 'error'
  data: any
}> = []

export async function GET() {
  return NextResponse.json({ logs: webhookLogs.slice(-20) }) // Last 20 logs
}

export async function POST(request: Request) {
  const log = await request.json()
  webhookLogs.push({
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    ...log
  })
  return NextResponse.json({ success: true })
}