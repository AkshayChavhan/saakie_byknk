/**
 * Next.js instrumentation hook — runs once when the server starts (and once
 * per cold start on Vercel). Used to validate the environment up front; see
 * lib/server/env.ts.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { assertEnv } = await import('./lib/server/env');
    assertEnv();
  }
}
