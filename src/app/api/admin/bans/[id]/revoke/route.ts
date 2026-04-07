import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { UserType} from '@prisma/client';
import { adminAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/response';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin authentication
    const admin = await adminAuth(request);
    if (!admin) {
      return errorResponse('Unauthorized', 401);
    }

    const { id } = await params;

    // Find ban
    const ban = await db.ban.findUnique({
      where: { id },
    });

    if (!ban) {
      return errorResponse('Ban not found', 404);
    }

    if (!ban.isActive) {
      return errorResponse('Ban is already inactive', 400);
    }

    // Deactivate ban
    await db.ban.update({
      where: { id },
      data: { isActive: false },
    });

    // Update user isBanned status
    if (ban.userId) {
      // Check if there are any other active bans for this user
      const otherActiveBans = await db.ban.count({
        where: {
          userId: ban.userId,
          isActive: true,
          id: { not: id },
        },
      });

      // Only set isBanned=false if no other active bans exist
      if (otherActiveBans === 0) {
        if (ban.userType === UserType.REGISTERED && ban.userId) {
          await db.user.update({
            where: { id: ban.userId },
            data: { isBanned: false },
          });
        } else if (ban.userType === UserType.ANONYMOUS && ban.userId) {
          await db.anonymousUser.updateMany({
            where: { id: ban.userId },
            data: { isBanned: false },
          });
        }
      }
    }

    // Log action
    await db.systemLog.create({
      data: {
        level: LogLevel.INFO,
        action: 'ban_revoked',
        userId: admin.id,
        userType: UserType.REGISTERED,
        details: `${admin.name} revoked ban ${id} for ${ban.userName || ban.userId || 'unknown'} (${ban.userType})`,
      },
    });

    return successResponse({
      message: 'Ban has been revoked',
      banId: id,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return errorResponse(message, 500);
  }
}
