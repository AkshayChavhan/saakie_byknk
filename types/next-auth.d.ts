import type { DefaultSession } from 'next-auth';

/**
 * Augment Auth.js types so `id` and `role` are typed on the session user and
 * the JWT. These values are populated by the callbacks in `auth.config.ts`.
 */
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession['user'];
  }

  interface User {
    role?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    role?: string;
  }
}
