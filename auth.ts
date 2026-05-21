import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { authConfig } from './auth.config';

/**
 * Full Auth.js configuration (Node runtime).
 *
 * Spreads the edge-safe `authConfig` and adds the Credentials provider, whose
 * `authorize()` uses Prisma + bcrypt — neither of which is edge-safe, so they
 * must NOT leak into `auth.config.ts`.
 *
 * Future providers (Google OAuth, magic-link) are added to the `providers`
 * array below. Magic-link additionally needs the Prisma adapter and the
 * Auth.js adapter models in `schema.prisma`.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email =
          typeof credentials?.email === 'string'
            ? credentials.email.trim().toLowerCase()
            : '';
        const password =
          typeof credentials?.password === 'string' ? credentials.password : '';

        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            imageUrl: true,
            role: true,
            password: true,
          },
        });

        // No user, or an OAuth-only user with no password set.
        if (!user || !user.password) return null;

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return null;

        // Returned object becomes the `user` arg of the `jwt` callback.
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.imageUrl,
          role: user.role,
        };
      },
    }),
  ],
});
