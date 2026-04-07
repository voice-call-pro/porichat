import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '@/lib/db';
import { UserRole } from '@prisma/client';

// Token payload type
interface TokenPayload {
  userId: string;
  role: UserRole;
}

/**
 * Generate a JWT access token
 */
export function generateToken(userId: string, role: UserRole): string {
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
 * ADMIN AUTH
 */
export async function adminAuth(request: Request): Promise<{
  id: string;
  name: string;
  email: string;
  role: UserRole;
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

    if (!user) return null;

    // ✅ FIXED ENUM CHECK
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.MODERATOR) {
      return null;
    }

    return user;
  } catch {
    return null;
  }
}

/**
 * USER AUTH
 */
export async function userAuth(request: Request): Promise<{
  id: string;
  name: string;
  email: string;
  role: UserRole;
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

/**
 * BAN CHECK
 */
export async function checkBanStatus(
  userId?: string,
  fingerprint?: string,
  ipAddress?: string
): Promise<{ isBanned: boolean; reason?: string }> {
  const orConditions: Record<string, unknown>[] = [];

  if (userId) orConditions.push({ userId });
  if (fingerprint) orConditions.push({ fingerprint });
  if (ipAddress) orConditions.push({ ipAddress });

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
 * BAN GUARD
 */
export async function banGuard(request: Request): Promise<{
  isBanned: boolean;
  reason?: string;
} | null> {
  const fingerprint = request.headers.get('x-fingerprint');
  const clientIp =
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown';

  return checkBanStatus(undefined, fingerprint || undefined, clientIp);
}
