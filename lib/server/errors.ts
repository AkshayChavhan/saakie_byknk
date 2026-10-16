import 'server-only';
import { NextResponse } from 'next/server';

export class AppError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode: number = 500, code: string = 'SERVER_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function apiError(err: unknown): NextResponse {
  if (err instanceof AppError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: err.message,
          code: err.code,
          ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
        },
      },
      { status: err.statusCode }
    );
  }

  // Unexpected errors carry Prisma query text, validation detail and the
  // like. That belongs in the server log, not in the response body.
  const isDev = process.env.NODE_ENV === 'development';
  const message = isDev && err instanceof Error ? err.message : 'Internal server error';
  const stack = err instanceof Error ? err.stack : undefined;

  console.error('API Error:', err);

  return NextResponse.json(
    {
      success: false,
      error: {
        message,
        code: 'SERVER_ERROR',
        ...(isDev && stack ? { stack } : {}),
      },
    },
    { status: 500 }
  );
}
