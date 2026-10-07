import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, requireSuperAdmin } from '@/lib/server/auth';
import { apiError } from '@/lib/server/errors';
import {
  runBackup,
  isBackupRunning,
  readBackupConfig,
  BackupConfigError,
  SNAPSHOTS_KEPT,
} from '@/lib/server/backup';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Copying every collection can take a while on a cold Atlas cluster. Vercel
// caps this to whatever the plan allows (60s on Hobby), and a run that is cut
// short is left RUNNING until it goes stale — see docs/BACKUP.md.
export const maxDuration = 300;

/**
 * GET — backup history for the admin page, plus whether a destination is even
 * configured, so the UI can explain itself instead of failing on the button.
 */
export async function GET() {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;
    const guard = requireSuperAdmin(r);
    if (guard) return guard;

    let configured = true;
    let configError: string | null = null;
    try {
      readBackupConfig();
    } catch (error) {
      configured = false;
      configError = error instanceof BackupConfigError ? error.message : 'Backup is not configured.';
    }

    const runs = await prisma.backupRun.findMany({
      orderBy: { startedAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({
      configured,
      configError,
      snapshotsKept: SNAPSHOTS_KEPT,
      running: await isBackupRunning(new Date()),
      runs,
    });
  } catch (error) {
    return apiError(error);
  }
}

/**
 * POST — run a backup now.
 *
 * SUPER_ADMIN only: this reads every row in the database, customer PII
 * included, and writes it somewhere else. One at a time, so two admins pressing
 * the button together cannot interleave writes into the same snapshot.
 */
export async function POST() {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;
    const guard = requireSuperAdmin(r);
    if (guard) return guard;

    const now = new Date();

    if (await isBackupRunning(now)) {
      return NextResponse.json(
        { error: 'A backup is already running. Wait for it to finish.' },
        { status: 409 }
      );
    }

    const result = await runBackup({
      now,
      triggeredById: r.id,
      triggeredByEmail: r.email ?? null,
    });

    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  } catch (error) {
    if (error instanceof BackupConfigError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }
    return apiError(error);
  }
}
