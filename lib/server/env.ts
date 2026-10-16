import 'server-only';

/**
 * Startup check for environment variables.
 *
 * Without this, a missing key only surfaces when a request first needs it: a
 * blank Cloudinary secret as a failed product upload, a blank Razorpay secret
 * as a 500 on the first payment. `register()` in instrumentation.ts calls
 * this once per server start, so a bad deploy is loud in the logs at boot.
 *
 * Required variables throw in production (the server cannot do its job
 * without them). Optional integrations only warn: the store runs without
 * them, with that feature disabled.
 */

const REQUIRED = [
  'DATABASE_URL',
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'CLERK_SECRET_KEY',
  'NEXT_PUBLIC_APP_URL',
] as const;

/** Groups that must be set together for the integration to work. */
const OPTIONAL_GROUPS: Record<string, readonly string[]> = {
  'Clerk webhook (/api/webhooks/clerk)': ['CLERK_WEBHOOK_SIGNING_SECRET'],
  'Razorpay payments': ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET'],
  'Stripe payments': ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
  'Cloudinary uploads': ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'],
  'AI chat (/api/chat)': ['ANTHROPIC_API_KEY'],
  'Shared rate limiting': ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'],
};

export interface EnvReport {
  missingRequired: string[];
  /** Integration name → the variables it is missing (only partially-set groups). */
  partialGroups: Record<string, string[]>;
  /** Integrations with none of their variables set — simply disabled. */
  disabled: string[];
}

export function inspectEnv(env: NodeJS.ProcessEnv = process.env): EnvReport {
  const isSet = (name: string) => Boolean(env[name] && env[name]!.trim());

  const missingRequired = REQUIRED.filter((name) => !isSet(name));
  const partialGroups: Record<string, string[]> = {};
  const disabled: string[] = [];

  for (const [group, names] of Object.entries(OPTIONAL_GROUPS)) {
    const missing = names.filter((name) => !isSet(name));
    if (missing.length === 0) continue;
    if (missing.length === names.length) disabled.push(group);
    else partialGroups[group] = missing;
  }

  return { missingRequired, partialGroups, disabled };
}

/**
 * Log the report. Throws when a required variable is missing in production,
 * except during `next build`, which has no runtime secrets and must still
 * succeed.
 */
export function assertEnv(env: NodeJS.ProcessEnv = process.env): EnvReport {
  const report = inspectEnv(env);

  for (const [group, missing] of Object.entries(report.partialGroups)) {
    console.warn(`[env] ${group} is partly configured; missing ${missing.join(', ')} — it will not work.`);
  }
  if (report.disabled.length > 0) {
    console.info(`[env] not configured (feature off): ${report.disabled.join('; ')}`);
  }

  if (report.missingRequired.length > 0) {
    const message = `[env] missing required variable(s): ${report.missingRequired.join(', ')}`;
    const isBuild = env.NEXT_PHASE === 'phase-production-build';
    if (env.NODE_ENV === 'production' && !isBuild) {
      throw new Error(message);
    }
    console.error(message);
  }

  return report;
}
