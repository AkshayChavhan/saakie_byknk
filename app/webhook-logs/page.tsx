'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'

interface WebhookLog {
  id: string
  timestamp: string
  eventType: string
  status: 'success' | 'error'
  data: any
}

export default function WebhookLogsPage() {
  const [logs, setLogs] = useState<WebhookLog[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/webhook-logs')
      const data = await response.json()
      setLogs(data.logs)
    } catch (error) {
      console.error('Failed to fetch logs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
    const interval = setInterval(fetchLogs, 5000) // Refresh every 5 seconds
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <div className="text-center">Loading webhook logs...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Webhook Logs</h1>
        <button
          onClick={fetchLogs}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Refresh
        </button>
      </div>

      <div className="space-y-4">
        {logs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No webhook logs found. Trigger some user actions to see logs here.
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="border rounded-lg p-4 bg-white shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                    {log.status}
                  </Badge>
                  <span className="font-medium">{log.eventType}</span>
                </div>
                <span className="text-sm text-gray-500">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
              <details className="mt-2">
                <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                  View Details
                </summary>
                <pre className="mt-2 p-3 bg-gray-50 rounded text-xs overflow-x-auto">
                  {JSON.stringify(log.data, null, 2)}
                </pre>
              </details>
            </div>
          ))
        )}
      </div>
    </div>
  )
}