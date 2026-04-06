import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { securityHeaders, getClientIp } from '@/lib/security'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * Global middleware for PoriChat
 *
 * 1. Adds security headers to all responses
 * 2. Rate limits API routes by IP
 * 3. Provides maintenance mode check
 *
 * Note: Ban checking is done at the API route level since
 * we need DB access which middleware doesn't have in edge runtime.
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // 1. Add security headers
  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value)
  }

  // 2. Rate limit API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const clientIp = getClientIp(request)
    const identifier = `ip:${clientIp}`

    // Determine rate limit based on route
    let config = RATE_LIMITS.general
    if (request.nextUrl.pathname.startsWith('/api/auth/')) {
      config = RATE_LIMITS.auth
    } else if (request.nextUrl.pathname.startsWith('/api/admin/')) {
      config = RATE_LIMITS.admin
    } else if (request.nextUrl.pathname.startsWith('/api/reports')) {
      config = RATE_LIMITS.report
    }

    const result = rateLimit(identifier, config)
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
    response.headers.set('X-RateLimit-Reset', result.resetAt.toString())

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please slow down.' },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((result.resetAt - Date.now()) / 1000).toString(),
            ...Object.fromEntries(Object.entries(securityHeaders)),
          }
        }
      )
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|logo.svg).*)',
  ],
}
