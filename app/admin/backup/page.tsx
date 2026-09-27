'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  ArrowLeft,
  DatabaseBackup,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Clock,
  ChevronDown,
  ChevronUp,
  HardDriveDownload,
  Download,
} from 'lucide-react'
import { fetchApi } from '@/lib/api'
import { useToast } from '@/components/ui/toast'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { cn } from '@/lib/utils'

type BackupStatus = 'RUNNING' | 'SUCCESS' | 'PARTIAL' | 'FAILED'

interface CollectionResult {
  collection: string
  documents: number
  error?: string
}

interface BackupRun {
  id: string
  snapshot: string
  status: BackupStatus
  triggeredByEmail: string | null
  targetDatabase: string | null
  collections: CollectionResult[] | null
  totalCollections: number
  totalDocuments: number
  durationMs: number | null
  error: string | null
  startedAt: string
  finishedAt: string | null
}

interface Payload {
  configured: boolean
  configError: string | null
  snapshotsKept: number
  running: boolean
  runs: BackupRun[]
}

const STATUS_STYLES: Record<BackupStatus, { badge: string; label: string; Icon: typeof CheckCircle2 }> = {
  SUCCESS: { badge: 'bg-green-100 text-green-700', label: 'Success', Icon: CheckCircle2 },
  PARTIAL: { badge: 'bg-amber-100 text-amber-700', label: 'Partial', Icon: AlertTriangle },
  FAILED: { badge: 'bg-red-100 text-red-700', label: 'Failed', Icon: XCircle },
  RUNNING: { badge: 'bg-blue-100 text-blue-700', label: 'Running', Icon: Loader2 },
}

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

const formatDuration = (ms: number | null) => {
  if (ms == null) return '—'
  if (ms < 1000) return `${ms} ms`
  const seconds = ms / 1000
  if (seconds < 60) return `${seconds.toFixed(1)} s`
  return `${Math.floor(seconds / 60)} min ${Math.round(seconds % 60)} s`
}

export default function BackupPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  // Backups read every row in the database, customer details included, so this
  // page is SUPER_ADMIN only — matching the API.
  const authorized = session?.user?.role === 'SUPER_ADMIN'

  const toast = useToast()
  // ToastProvider hands out a fresh context object on every toast, so anything
  // that both depends on `toast` and toasts on failure would re-create itself
  // and re-run its effect. Read it through a ref to keep a stable identity.
  const toastRef = useRef(toast)
  toastRef.current = toast

  const [data, setData] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [downloading, setDownloading] = useState<string | null>(null)

  const fetchRuns = useCallback(async () => {
    try {
      const response = await fetchApi('/api/admin/backup')
      if (response.ok) {
        setData(await response.json())
      } else {
        toastRef.current.error('Failed to Load', 'Could not load backup history.')
      }
    } catch (error) {
      console.error('Failed to fetch backups:', error)
      toastRef.current.error('Failed to Load', 'Could not load backup history.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'loading') return
    if (!authorized) {
      setLoading(false)
      return
    }
    fetchRuns()
  }, [status, authorized, fetchRuns])

  /**
   * Pull the snapshot down as a file. Fetched rather than linked so a failure
   * surfaces as a toast instead of navigating the admin away from the page to
   * a JSON error body.
   */
  const downloadSnapshot = useCallback(async (snapshot: string) => {
    setDownloading(snapshot)
    try {
      const response = await fetchApi(`/api/admin/backup/${snapshot}/download`)
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        toastRef.current.error('Download Failed', body?.error ?? 'Could not download the backup file.')
        return
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `saakie-backup-${snapshot}.json`
      document.body.appendChild(link)
      link.click()
      link.remove()
      // Revoke on the next tick: revoking synchronously can cancel the download
      // in some browsers before it has started reading the blob.
      setTimeout(() => URL.revokeObjectURL(url), 0)
    } catch (error) {
      console.error('Backup download failed:', error)
      toastRef.current.error('Download Failed', 'Could not download the backup file.')
    } finally {
      setDownloading(null)
    }
  }, [])

  const startBackup = async () => {
    setConfirmOpen(false)
    setRunning(true)
    try {
      const response = await fetchApi('/api/admin/backup', { method: 'POST' })
      const body = await response.json().catch(() => null)
      if (response.ok) {
        toastRef.current.success(
          body?.status === 'PARTIAL' ? 'Backup Finished With Problems' : 'Backup Complete',
          body?.status === 'PARTIAL'
            ? 'Some collections did not copy. Opening the details below. Downloading what was copied…'
            : `${body?.totalDocuments ?? 0} documents copied across ${body?.totalCollections ?? 0} collections. Downloading your copy…`
        )
        // A third copy, on the machine that pressed the button. The backup
        // database protects against losing the live one; this file protects
        // against losing access to both.
        if (body?.snapshot) await downloadSnapshot(body.snapshot)
      } else {
        toastRef.current.error('Backup Failed', body?.error ?? 'The backup could not be completed.')
      }
      await fetchRuns()
    } catch (error) {
      console.error('Backup failed:', error)
      toastRef.current.error('Backup Failed', 'The request did not complete.')
      await fetchRuns()
    } finally {
      setRunning(false)
    }
  }

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-red-600 mx-auto mb-3" />
          <p className="text-gray-600">Loading backups…</p>
        </div>
      </div>
    )
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">
            Backups copy every record in the shop, customer details included, so only a Super Admin can run them.
          </p>
          <Link href="/" className="inline-block bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700">
            Go to Home
          </Link>
        </div>
      </div>
    )
  }

  const runs = data?.runs ?? []
  const lastGood = runs.find((r) => r.status === 'SUCCESS' || r.status === 'PARTIAL')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <button
            onClick={() => router.push('/admin')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors group"
          >
            <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Back to Dashboard</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-900 text-white">
              <DatabaseBackup className="h-5 w-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Backups</h1>
          </div>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">
            Copies every collection to a separate backup database. Each run is kept as its own snapshot,
            so you can go back a generation — the last {data?.snapshotsKept ?? 5} are retained. Each run also downloads a copy to this computer.
          </p>
        </div>

        {/* Not configured */}
        {!data?.configured && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="font-medium text-amber-900">No backup database configured</p>
              <p className="text-sm text-amber-800 mt-1">
                {data?.configError ?? 'Set BACKUP_DATABASE_URL to a database on a separate cluster.'}
              </p>
              <p className="text-xs text-amber-700 mt-2">
                See <code className="font-mono">docs/BACKUP.md</code> for how to set it up.
              </p>
            </div>
          </div>
        )}

        {/* Run panel */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="font-semibold text-gray-900">Run a backup now</h2>
              {lastGood ? (
                <p className="text-sm text-gray-600 mt-1">
                  Last backup {formatDateTime(lastGood.startedAt)} —{' '}
                  {lastGood.totalDocuments.toLocaleString()} documents across {lastGood.totalCollections} collections.
                </p>
              ) : (
                <p className="text-sm text-gray-600 mt-1">No successful backup yet.</p>
              )}
            </div>
            <button
              onClick={() => setConfirmOpen(true)}
              disabled={running || !data?.configured}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white transition-colors',
                running || !data?.configured
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700'
              )}
            >
              {running ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Backing up…
                </>
              ) : (
                <>
                  <HardDriveDownload className="h-4 w-4" />
                  Back up now
                </>
              )}
            </button>
          </div>
          {running && (
            <p className="text-xs text-gray-500 mt-3">
              Keep this tab open. Large collections take a while, and your download starts once the copy finishes.
            </p>
          )}
        </section>

        {/* History */}
        <h2 className="font-semibold text-gray-900 mb-3">History</h2>
        {runs.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
            <DatabaseBackup className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600">No backups have been run yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {runs.map((run) => {
              const style = STATUS_STYLES[run.status]
              const isOpen = expanded.has(run.id)
              const failedCollections = (run.collections ?? []).filter((c) => c.error)
              return (
                <div key={run.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-4 flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium', style.badge)}>
                          <style.Icon className={cn('h-3.5 w-3.5', run.status === 'RUNNING' && 'animate-spin')} />
                          {style.label}
                        </span>
                        <span className="font-mono text-sm text-gray-900">{run.snapshot}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">
                        {run.totalDocuments.toLocaleString()} documents · {run.totalCollections} collections ·{' '}
                        {formatDuration(run.durationMs)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDateTime(run.startedAt)}
                        </span>
                        {run.triggeredByEmail && <span>by {run.triggeredByEmail}</span>}
                        {run.targetDatabase && <span>→ {run.targetDatabase}</span>}
                      </p>
                      {run.error && <p className="text-sm text-red-600 mt-2">{run.error}</p>}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {(run.status === 'SUCCESS' || run.status === 'PARTIAL') && (
                        <button
                          onClick={() => downloadSnapshot(run.snapshot)}
                          disabled={downloading === run.snapshot}
                          className="text-sm text-gray-600 hover:text-gray-900 inline-flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {downloading === run.snapshot ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                          {downloading === run.snapshot ? 'Preparing…' : 'Download'}
                        </button>
                      )}
                      {(run.collections ?? []).length > 0 && (
                        <button
                          onClick={() => toggle(run.id)}
                          className="text-sm text-gray-600 hover:text-gray-900 inline-flex items-center gap-1"
                        >
                          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          {isOpen ? 'Hide' : 'Details'}
                        </button>
                      )}
                    </div>
                  </div>

                  {isOpen && (
                    <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                      {failedCollections.length > 0 && (
                        <p className="text-sm text-red-600 mb-2">
                          {failedCollections.length} collection(s) did not copy.
                        </p>
                      )}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-sm">
                        {(run.collections ?? []).map((c) => (
                          <div key={c.collection} className="flex justify-between gap-2 min-w-0">
                            <span className={cn('truncate font-mono text-xs', c.error ? 'text-red-600' : 'text-gray-600')}>
                              {c.collection}
                            </span>
                            <span className={cn('shrink-0 tabular-nums', c.error ? 'text-red-600' : 'text-gray-900')}>
                              {c.error ? 'failed' : c.documents.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <p className="text-xs text-gray-500 mt-6">
          Restoring is deliberately not a button — it overwrites live data. Recover with{' '}
          <code className="font-mono">node scripts/restore-backup.mjs</code>; see{' '}
          <code className="font-mono">docs/BACKUP.md</code>.
        </p>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        tone="default"
        title="Back up the database now?"
        description="Every collection is copied to the backup database as a new snapshot. Nothing in the live shop changes. This can take a few minutes."
        confirmLabel="Back up now"
        cancelLabel="Cancel"
        busyLabel="Backing up…"
        busy={running}
        onConfirm={startBackup}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}
