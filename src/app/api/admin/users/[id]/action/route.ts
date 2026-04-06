import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { adminAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/response';
import { userActionSchema } from '@/lib/validation';

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
    const body = await request.json();

    // Validate input
    const parsed = userActionSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return errorResponse(firstError?.message || 'Invalid input', 400);
    }

    const { action, reason, duration } = parsed.data;

    // Find target user
    const targetUser = await db.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return errorResponse('User not found', 404);
    }

    // Prevent admin from demoting themselves
    if (id === admin.id && action === 'demote') {
      return errorResponse('Cannot demote yourself', 400);
    }

    switch (action) {
      case 'ban': {
        await db.user.update({
          where: { id },
          data: { isBanned: true },
        });

        // Create ban record
        await db.ban.create({
          data: {
            userId: targetUser.id,
            userType: 'registered',
            userName: targetUser.name,
            reason: reason || 'Banned by admin',
            type: duration ? 'temporary' : 'permanent',
            duration: duration,
            expiresAt: duration ? new Date(Date.now() + duration * 1000) : null,
            bannedBy: admin.id,
            bannedByName: admin.name,
          },
        });

        await db.systemLog.create({
          data: {
            level: 'warning',
            action: 'user_banned',
            userId: admin.id,
            userType: 'registered',
            details: `Banned user ${targetUser.name} (${targetUser.id}). Reason: ${reason || 'No reason provided'}`,
          },
        });

        return successResponse({ message: `User ${targetUser.name} has been banned` });
      }

      case 'unban': {
        await db.user.update({
          where: { id },
          data: { isBanned: false },
        });

        // Deactivate active bans
        await db.ban.updateMany({
          where: { userId: id, isActive: true },
          data: { isActive: false },
        });

        await db.systemLog.create({
          data: {
            level: 'info',
            action: 'user_unbanned',
            userId: admin.id,
            userType: 'registered',
            details: `Unbanned user ${targetUser.name} (${targetUser.id})`,
          },
        });

        return successResponse({ message: `User ${targetUser.name} has been unbanned` });
      }

      case 'suspend': {
        // Suspend is a temporary ban (24 hours)
        const suspendDuration = duration || 86400; // 24 hours default
        await db.user.update({
          where: { id },
          data: { isBanned: true },
        });

        await db.ban.create({
          data: {
            userId: targetUser.id,
            userType: 'registered',
            userName: targetUser.name,
            reason: reason || 'Suspended by admin',
            type: 'temporary',
            duration: suspendDuration,
            expiresAt: new Date(Date.now() + suspendDuration * 1000),
            bannedBy: admin.id,
            bannedByName: admin.name,
          },
        });

        await db.systemLog.create({
          data: {
            level: 'warning',
            action: 'user_suspended',
            userId: admin.id,
            userType: 'registered',
            details: `Suspended user ${targetUser.name} (${targetUser.id}) for ${suspendDuration}s. Reason: ${reason || 'No reason provided'}`,
          },
        });

        return successResponse({ message: `User ${targetUser.name} has been suspended` });
      }

      case 'promote': {
        if (targetUser.role === 'admin') {
          return errorResponse('User is already an admin', 400);
        }

        const newRole = targetUser.role === 'user' ? 'moderator' : 'admin';
        await db.user.update({
          where: { id },
          data: { role: newRole },
        });

        await db.systemLog.create({
          data: {
            level: 'info',
            action: 'user_promoted',
            userId: admin.id,
            userType: 'registered',
            details: `Promoted user ${targetUser.name} (${targetUser.id}) from ${targetUser.role} to ${newRole}`,
          },
        });

        return successResponse({ message: `User ${targetUser.name} has been promoted to ${newRole}` });
      }

      case 'demote': {
        if (targetUser.role === 'user') {
          return errorResponse('User is already a regular user', 400);
        }

        const demotedRole = targetUser.role === 'admin' ? 'moderator' : 'user';
        await db.user.update({
          where: { id },
          data: { role: demotedRole },
        });

        await db.systemLog.create({
          data: {
            level: 'warning',
            action: 'user_demoted',
            userId: admin.id,
            userType: 'registered',
            details: `Demoted user ${targetUser.name} (${targetUser.id}) from ${targetUser.role} to ${demotedRole}`,
          },
        });

        return successResponse({ message: `User ${targetUser.name} has been demoted to ${demotedRole}` });
      }

      default:
        return errorResponse('Invalid action', 400);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return errorResponse(message, 500);
  }
}
