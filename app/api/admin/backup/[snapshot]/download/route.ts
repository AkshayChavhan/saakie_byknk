import { NextResponse } from 'next/server';
import { requireAuth, requireSuperAdmin } from '@/lib/server/auth';
import { apiError } from '@/lib/server/errors';
import {
  streamSnapshotExport,
  exportFilename,
  BackupConfigError,
} from '@/lib/server/backup';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * GET — download one snapshot as a single JSON file.
 *
 * Read out of the BACKUP database, not the live one, so the file is provably
 * the same bytes as the snapshot it claims to be rather than a fresh read of a
 * database that has moved on since.
 *
 * The response is streamed: the file holds the entire shop, and buffering it to
 * build a Content-Length would fail exactly when the shop is big enough for the
 * download to matter.
 *
 * SUPER_ADMIN only — this is every customer record leaving the building as a
 * file on somebody's laptop.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ snapshot: string }> }
) {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;
    const guard = requireSuperAdmin(r);
    if (guard) return guard;

    const { snapshot } = await params;
    // The value lands in a collection-name prefix and a filename, so keep it to
    // the shape snapshotStamp() produces and nothing else.
    if (!/^\d{8}T\d{6}Z$/.test(snapshot)) {
      return NextResponse.json({ error: 'Invalid snapshot id' }, { status: 400 });
    }

    const chunks = streamSnapshotExport(snapshot, new Date());

    // Pull the first chunk eagerly so a missing snapshot answers 404 with JSON,
    // rather than a 200 that turns into a broken download.
    let first;
    try {
      first = await chunks.next();
    } catch (error) {
      if (error instanceof BackupConfigError) {
        const status = error.code === 'NO_SNAPSHOT' ? 404 : 400;
        return NextResponse.json({ error: error.message, code: error.code }, { status });
      }
      throw error;
    }

    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          if (!first.done) controller.enqueue(encoder.encode(first.value));
          for await (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
      // Browser cancelled the download — let the generator's finally close the
      // Mongo connection instead of leaking it.
      async cancel() {
        await chunks.return(undefined).catch(() => undefined);
      },
    });

    return new Response(body, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${exportFilename(snapshot)}"`,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
