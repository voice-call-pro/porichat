import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken, generateToken } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/response'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/security'

/**
 * POST /api/auth/refresh
 * Refresh an access token
 *
 * Accepts a valid (possibly expired) access token and returns a new one.
 * Checks if the user still exists and is not banned.
 */
export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request)

    // Rate limit refresh attempts
    const rl = rateLimit(`refresh:${clientIp}`, { maxRequests: 20, windowMs: 60_000 })
    if (!rl.success) {
      return errorResponse('Too many refresh attempts. Please slow down.', 429)
    }

    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse('Authorization token required', 401)
    }

    const token = authHeader.substring(7)

    // Verify token (allow expired tokens for refresh)
    let payload: { userId: string; role: string }
    try {
      payload = verifyToken(token)
    } catch {
      return errorResponse('Invalid token', 401)
    }

    // Find user and verify they still exist and are not banned
    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, name: true, email: true, role: true, isBanned: true },
    })

    if (!user) {
      return errorResponse('User not found', 404)
    }

    if (user.isBanned) {
      return errorResponse('Account has been banned', 403)
    }

    // Generate new token
    const newToken = generateToken(user.id, user.role)

    return successResponse({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token: newToken,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return errorResponse(message, 500)
  }
}
