import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { adminAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/response';
import { manualBanSchema } from '@/lib/validation';
import { BanType, LogLevel, UserType } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    // 🔐 Verify admin authentication
    const admin = await adminAuth(request);
    if (!admin) {
      return errorResponse('Unauthorized', 401);
    }

    const body = await request.json();

    // ✅ Validate input
    const parsed = manualBanSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return errorResponse(firstError?.message || 'Invalid input', 400);
    }

    const { fingerprint, ipAddress, reason, type, duration } = parsed.data;

    // ❗ Must have at least one identifier
    if (!fingerprint && !ipAddress) {
      return errorResponse('Either fingerprint or ipAddress must be provided', 400);
    }

    // 🔥 Convert string → Prisma enum
    const finalType =
      type === 'temporary'
        ? BanType.TEMPORARY
        : BanType.PERMANENT;

    // ⏳ Calculate expiration
    const expiresAt =
      finalType === BanType.TEMPORARY && duration
        ? new Date(Date.now() + duration * 1000)
        : null;

    // ✅ Create ban
    const ban = await db.ban.create({
      data: {
        fingerprintHash: fingerprint || undefined,
        ipHash: ipAddress || undefined,
        reason,
        type: finalType,
        duration: duration || null,
        expiresAt,
        bannedById: admin.id,
      },
    });

    // 👻 Ban matching anonymous users
    if (fingerprint) {
      await db.anonymousUser.updateMany({
        where: { fingerprintHash: fingerprint },
        data: { isBanned: true },
      });
    }

    // 🧾 Log action
    await db.systemLog.create({
      data: {
        level: LogLevel.WARN,
        action: 'manual_ban',
        userId: admin.id,
        userType: UserType.REGISTERED,
        details: `${admin.name} created manual ban. Type: ${finalType}, Duration: ${
          duration || 'permanent'
        }. Fingerprint: ${fingerprint || 'none'}, IP: ${
          ipAddress || 'none'
        }. Reason: ${reason}`,
      },
    });

    return successResponse({
      message: 'Manual ban has been created',
      ban,
    });

  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Internal server error';

    return errorResponse(message, 500);
  }
}
