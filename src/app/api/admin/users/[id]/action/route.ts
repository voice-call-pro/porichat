import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { adminAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/response';
import { userActionSchema } from '@/lib/validation';
import {
  LogLevel,
  UserType,
  BanType,
  UserRole,
} from '@prisma/client';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await adminAuth(request);
    if (!admin) {
      return errorResponse('Unauthorized', 401);
    }

    const { id } = await params;
    const body = await request.json();

    const parsed = userActionSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return errorResponse(firstError?.message || 'Invalid input', 400);
    }

    const { action, reason, duration } = parsed.data;

    const targetUser = await db.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return errorResponse('User not found', 404);
    }

    if (id === admin.id && action === 'demote') {
      return errorResponse('Cannot demote yourself', 400);
    }

    switch (action) {
      // 🔴 BAN
      case 'ban': {
        await db.user.update({
          where: { id },
          data: { isBanned: true },
        });

        const finalType =
          duration ? BanType.TEMPORARY : BanType.PERMANENT;

        await db.ban.create({
          data: {
            userId: targetUser.id,
            userType: UserType.REGISTERED,
            reason: reason || 'Banned by admin',
            type: finalType,
            duration: duration || null,
            expiresAt: duration
              ? new Date(Date.now() + duration * 1000)
              : null,
            bannedById: admin.id,
          },
        });

        await db.systemLog.create({
          data: {
            level: LogLevel.WARN,
            action: 'user_banned',
            userId: admin.id,
            userType: UserType.REGISTERED,
            details: `Banned user ${targetUser.name} (${targetUser.id})`,
          },
        });

        return successResponse({
          message: `User ${targetUser.name} banned`,
        });
      }

      // 🟢 UNBAN
      case 'unban': {
        await db.user.update({
          where: { id },
          data: { isBanned: false },
        });

        await db.ban.updateMany({
          where: { userId: id, isActive: true },
          data: { isActive: false },
        });

        await db.systemLog.create({
          data: {
            level: LogLevel.INFO,
            action: 'user_unbanned',
            userId: admin.id,
            userType: UserType.REGISTERED,
            details: `Unbanned ${targetUser.name}`,
          },
        });

        return successResponse({
          message: `User ${targetUser.name} unbanned`,
        });
      }

      // 🟡 SUSPEND
      case 'suspend': {
        const suspendDuration = duration || 86400;

        await db.user.update({
          where: { id },
          data: { isBanned: true },
        });

        await db.ban.create({
          data: {
            userId: targetUser.id,
            userType: UserType.REGISTERED,
            reason: reason || 'Suspended',
            type: BanType.TEMPORARY,
            duration: suspendDuration,
            expiresAt: new Date(Date.now() + suspendDuration * 1000),
            bannedById: admin.id,
          },
        });

        await db.systemLog.create({
          data: {
            level: LogLevel.WARN,
            action: 'user_suspended',
            userId: admin.id,
            userType: UserType.REGISTERED,
            details: `Suspended ${targetUser.name}`,
          },
        });

        return successResponse({
          message: `User ${targetUser.name} suspended`,
        });
      }

      // 🔼 PROMOTE
      case 'promote': {
        if (targetUser.role === UserRole.ADMIN) {
          return errorResponse('Already admin', 400);
        }

        const newRole =
          targetUser.role === UserRole.USER
            ? UserRole.MODERATOR
            : UserRole.ADMIN;

        await db.user.update({
          where: { id },
          data: { role: newRole },
        });

        await db.systemLog.create({
          data: {
            level: LogLevel.INFO,
            action: 'user_promoted',
            userId: admin.id,
            userType: UserType.REGISTERED,
            details: `Promoted ${targetUser.name} to ${newRole}`,
          },
        });

        return successResponse({
          message: `User promoted to ${newRole}`,
        });
      }

      // 🔽 DEMOTE
      case 'demote': {
        if (targetUser.role === UserRole.USER) {
          return errorResponse('Already user', 400);
        }

        const newRole =
          targetUser.role === UserRole.ADMIN
            ? UserRole.MODERATOR
            : UserRole.USER;

        await db.user.update({
          where: { id },
          data: { role: newRole },
        });

        await db.systemLog.create({
          data: {
            level: LogLevel.WARN,
            action: 'user_demoted',
            userId: admin.id,
            userType: UserType.REGISTERED,
            details: `Demoted ${targetUser.name} to ${newRole}`,
          },
        });

        return successResponse({
          message: `User demoted to ${newRole}`,
        });
      }

      default:
        return errorResponse('Invalid action', 400);
    }

  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Internal server error';

    return errorResponse(message, 500);
  }
}
