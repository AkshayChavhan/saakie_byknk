/**
 * Nightly database backup, run by .github/workflows/nightly-backup.yml.
 *
 * Copies the live database into a new snapshot in the backup database (same
 * code as the admin "Back up now" button) and applies the retention rule.
 * Needs DATABASE_URL and BACKUP_DATABASE_URL. Exits 1 on failure.
 *
 *   pnpm backup:nightly                                   (env already set)
 *   pnpm exec tsx --env-file=.env.local --tsconfig tsconfig.scripts.json scripts/backup-nightly.ts
 *
 * See docs/BACKUP.md.
 */
import prisma from '@/lib/prisma'
import { redact } from '@/lib/server/backup'
import { runScheduledBackup } from '@/lib/server/backup-schedule'

runScheduledBackup()
  .then(async (code) => {
    await prisma.$disconnect().catch(() => undefined)
    process.exit(code)
  })
  .catch(async (error) => {
    console.log(`Backup crashed: ${redact(error)}`)
    await prisma.$disconnect().catch(() => undefined)
    process.exit(1)
  })
