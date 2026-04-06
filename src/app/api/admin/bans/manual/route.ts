import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { adminAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/response';
import { manualBanSchema } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const admin = await adminAuth(request);
    if (!admin) {
      return errorResponse('Unauthorized', 401);
    }

    const body = await request.json();

    // Validate input
    const parsed = manualBanSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return errorResponse(firstError?.message || 'Invalid input', 400);
    }

    const { fingerprint, ipAddress, reason, type, duration } = parsed.data;

    // At least one identifier must be provided
    if (!fingerprint && !ipAddress) {
      return errorResponse('Either fingerprint or ipAddress must be provided', 400);
    }

    // Calculate expiration for temporary bans
    const expiresAt = type === 'temporary' && duration
      ? new Date(Date.now() + duration * 1000)
      : null;

    // Create ban record
    const ban = await db.ban.create({
      data: {
        fingerprint: fingerprint || undefined,
        ipAddress: ipAddress || undefined,
        reason,
        type,
        duration: duration || null,
        expiresAt,
        bannedBy: admin.id,
        bannedByName: admin.name,
      },
    });

    // Try to ban matching anonymous users
    if (fingerprint) {
      await db.anonymousUser.updateMany({
        where: { fingerprint },
        data: { isBanned: true },
      });
    }

    // Log action
    await db.systemLog.create({
      data: {
        level: 'warning',
        action: 'manual_ban',
        userId: admin.id,
        userType: 'registered',
        details: `${admin.name} created manual ban. Type: ${type}, Duration: ${duration || 'permanent'}. Fingerprint: ${fingerprint || 'none'}, IP: ${ipAddress || 'none'}. Reason: ${reason}`,
      },
    });

    return successResponse({
      message: 'Manual ban has been created',
      ban,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return errorResponse(message, 500);
  }
}
