import { NextResponse } from 'next/server';

/**
 * Standard success response helper
 */
export function successResponse(data: unknown, status: number = 200) {
  return NextResponse.json(
    { success: true, ...data },
    { status }
  );
}

/**
 * Standard error response helper
 */
export function errorResponse(message: string, status: number = 400) {
  return NextResponse.json(
    { success: false, error: message },
    { status }
  );
}

/**
 * Validation error response with Zod error details
 */
export function validationErrorResponse(errors: Array<{ field: string; message: string }>, status: number = 400) {
  return NextResponse.json(
    { success: false, error: 'Validation failed', details: errors },
    { status }
  );
}

/**
 * Rate limit exceeded response
 */
export function rateLimitResponse(retryAfter: number) {
  return NextResponse.json(
    { success: false, error: 'Too many requests. Please slow down.' },
    {
      status: 429,
      headers: { 'Retry-After': retryAfter.toString() },
    }
  );
}
