import type { NextAuthConfig } from 'next-auth';

/**
 * Edge-safe Auth.js configuration.
 *
 * This file is imported by `middleware.ts`, which runs on the Edge runtime.
 * It MUST NOT import anything Node-only — no Prisma, no bcrypt, no
 * `server-only`. The Credentials provider (which needs bcrypt + Prisma)
 * lives in `auth.ts`, which spreads this config and adds the providers.
 *
 * When Google OAuth / magic-link are added later, edge-safe providers can be
 * listed here; provider logic that needs Node APIs stays in `auth.ts`.
 */
export const authConfig = {
  pages: {
    signIn: '/sign-in',
  },
  // Providers are added in `auth.ts`. Kept empty here so the Edge bundle
  // (middleware) stays free of Node-only provider code.
  providers: [],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    /**
     * Persist `id` and `role` on the JWT. `user` is only defined on initial
     * sign-in; on later calls the token already carries the values.
     */
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? 'USER';
      }
      return token;
    },
    /**
     * Expose `id` and `role` on `session.user` so client and server code can
     * read them without an extra round-trip.
     */
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as string) ?? 'USER';
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

export default authConfig;
