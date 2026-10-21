import 'server-only'
import {
  runBackup,
  isBackupRunning,
  BackupConfigError,
  redact,
} from '@/lib/server/backup'

/** How a scheduled run is labelled in the admin Backups history. */
export const SCHEDULED_TRIGGER = 'nightly (GitHub Actions)'

/**
 * One unattended backup, as the nightly job runs it. Returns the process exit
 * code: 0 when the snapshot copied cleanly (or another backup was already
 * running), 1 otherwise, so a failure turns the job red and GitHub emails.
 *
 * The repository is public, so job logs are public: every line written here is
 * a count, a status, a collection name or an already-redacted error. Never a
 * document, never a connection string.
 */
export async function runScheduledBackup(
  log: (line: string) => void = console.log,
  now: Date = new Date()
): Promise<number> {
  try {
    if (await isBackupRunning(now)) {
      log('Skipped: another backup is still running. The next scheduled run will try again.')
      return 0
    }

    const result = await runBackup({ now, triggeredByEmail: SCHEDULED_TRIGGER })

    log(`Snapshot ${result.snapshot}: ${result.status}`)
    log(
      `Copied ${result.totalDocuments} documents from ${result.totalCollections} collections in ${(
        result.durationMs / 1000
      ).toFixed(1)} s`
    )
    for (const c of result.collections.filter((c) => c.error)) {
      log(`  ${c.collection}: failed (${c.error})`)
    }
    if (result.pruned && result.pruned.length > 0) {
      log(`Removed ${result.pruned.length} older snapshot(s) outside the retention rule`)
    }
    if (result.error) log(`Error: ${result.error}`)

    return result.status === 'SUCCESS' ? 0 : 1
  } catch (error) {
    log(`Backup did not run: ${error instanceof BackupConfigError ? error.message : redact(error)}`)
    return 1
  }
}
