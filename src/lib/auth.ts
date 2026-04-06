import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '@/lib/db';
import { errorResponse } from '@/lib/response';

// Token payload type
interface TokenPayload {
  userId: string;
  role: string;
}

/**
 * Generate a JWT access token
 */
export function generateToken(userId: string, role: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }

  const payload: TokenPayload = { userId, role };

  return jwt.sign(payload, secret, {
    expiresIn: '7d',
  });
}

/**
 * Verify a JWT token and return the payload
 */
export function verifyToken(token: string): TokenPayload {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }

  try {
    return jwt.verify(token, secret) as TokenPayload;
  } catch {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Compare a plain password with a hashed password
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Extract user from Authorization header and verify admin/moderator role
 * Returns the authenticated user or null
 */
export async function adminAuth(request: Request): Promise<{
  id: string;
  name: string;
  email: string;
  role: string;
} | null> {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, name: true, email: true, role: true, isBanned: true },
    });

    if (!user) {
      return null;
    }

    // Only admin or moderator can access admin routes
    if (user.role !== 'admin' && user.role !== 'moderator') {
      return null;
    }

    return user;
  } catch {
    return null;
  }
}

// ============ USER AUTH (RBAC - any authenticated user) ============

/**
 * Extract user from Authorization header (any authenticated user, not just admin)
 * Returns the authenticated user or null
 */
export async function userAuth(request: Request): Promise<{
  id: string;
  name: string;
  email: string;
  role: string;
  isBanned: boolean;
} | null> {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, name: true, email: true, role: true, isBanned: true },
    });

    if (!user || user.isBanned) {
      return null;
    }

    return user;
  } catch {
    return null;
  }
}

// ============ BAN CHECKING ============

/**
 * Check if a user (by userId, fingerprint, or IP) is currently banned
 * Used for ban enforcement at the API level
 */
export async function checkBanStatus(
  userId?: string,
  fingerprint?: string,
  ipAddress?: string
): Promise<{ isBanned: boolean; reason?: string }> {
  const orConditions: Record<string, unknown>[] = [];

  if (userId) {
    orConditions.push({ userId });
  }
  if (fingerprint) {
    orConditions.push({ fingerprint });
  }
  if (ipAddress) {
    orConditions.push({ ipAddress });
  }

  if (orConditions.length === 0) {
    return { isBanned: false };
  }

  const ban = await db.ban.findFirst({
    where: {
      isActive: true,
      OR: orConditions,
    },
  });

  if (!ban) {
    return { isBanned: false };
  }

  // Check if temporary ban has expired
  if (ban.expiresAt && ban.expiresAt < new Date()) {
    await db.ban.update({
      where: { id: ban.id },
      data: { isActive: false },
    });
    return { isBanned: false };
  }

  return { isBanned: true, reason: ban.reason };
}

/**
 * Create a middleware function that checks ban status
 * Can be used in any API route
 */
export async function banGuard(request: Request): Promise<{
  isBanned: boolean;
  reason?: string;
} | null> {
  const fingerprint = request.headers.get('x-fingerprint');
  const clientIp = request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

  return checkBanStatus(undefined, fingerprint || undefined, clientIp);
}
