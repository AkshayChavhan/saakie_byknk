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
  // Trust the deployment host. On Vercel this is usually inferred, but being
  // explicit avoids `UntrustedHost` 500s behind the proxy / on custom domains.
  trustHost: true,
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
     * Persist `id`, `role`, `name` and `picture` on the JWT. `user` is only
     * defined on initial sign-in. When the client calls `session.update({...})`
     * after editing the profile, the new values arrive in the `session` arg
     * (trigger === 'update') and are written back onto the token so the change
     * reflects immediately without a re-login.
     */
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? 'USER';
        token.name = user.name ?? token.name;
        token.picture = (user as { image?: string | null }).image ?? token.picture;
      }
      if (trigger === 'update' && session) {
        const s = session as { name?: string; image?: string | null };
        if (typeof s.name === 'string') token.name = s.name;
        if (s.image !== undefined) token.picture = s.image;
      }
      return token;
    },
    /**
     * Expose `id`, `role`, `name` and `image` on `session.user` so client and
     * server code can read them without an extra round-trip.
     */
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as string) ?? 'USER';
        if (typeof token.name === 'string') session.user.name = token.name;
        if (token.picture !== undefined) session.user.image = (token.picture as string) ?? null;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

export default authConfig;
