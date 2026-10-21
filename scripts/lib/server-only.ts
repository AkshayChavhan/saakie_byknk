/**
 * Stand-in for Next.js's `server-only` marker when a script runs the shop's
 * server code directly with tsx (see tsconfig.scripts.json). A script is
 * server-side by definition, so there is nothing to guard against here.
 * Next.js and the tests resolve `server-only` their own way.
 */
export {}
