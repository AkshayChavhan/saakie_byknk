import 'server-only';
import { Prisma } from '@prisma/client';

/** True for a Prisma "unique constraint failed" error (code P2002). */
export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}
