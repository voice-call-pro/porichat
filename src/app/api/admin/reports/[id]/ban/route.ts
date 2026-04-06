import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { adminAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/response';
import { banFromReportSchema } from '@/lib/validation';

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
    const parsed = banFromReportSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return errorResponse(firstError?.message || 'Invalid input', 400);
    }

    const { type, duration, reason } = parsed.data;

    // Find report
    const report = await db.report.findUnique({
      where: { id },
    });

    if (!report) {
      return errorResponse('Report not found', 404);
    }

    // Calculate expiration for temporary bans
    const expiresAt = type === 'temporary' && duration
      ? new Date(Date.now() + duration * 1000)
      : null;

    // Create Ban record
    const ban = await db.ban.create({
      data: {
        userId: report.reportedId,
        userType: report.reportedType,
        userName: report.reportedName,
        fingerprint: report.fingerprint || undefined,
        ipAddress: report.ipAddress || undefined,
        reason,
        type,
        duration: duration || null,
        expiresAt,
        bannedBy: admin.id,
        bannedByName: admin.name,
      },
    });

    // Mark report as resolved
    await db.report.update({
      where: { id },
      data: {
        status: 'resolved',
        updatedAt: new Date(),
      },
    });

    // Update user banned status if registered user
    if (report.reportedType === 'registered') {
      await db.user.update({
        where: { id: report.reportedId },
        data: { isBanned: true },
      });
    } else if (report.reportedType === 'anonymous' && report.reportedId) {
      await db.anonymousUser.updateMany({
        where: { id: report.reportedId },
        data: { isBanned: true },
      });
    }

    // Log action
    await db.systemLog.create({
      data: {
        level: 'warning',
        action: 'ban_from_report',
        userId: admin.id,
        userType: 'registered',
        details: `${admin.name} banned ${report.reportedName} (${report.reportedType}:${report.reportedId}) from report ${id}. Type: ${type}, Duration: ${duration || 'permanent'}. Reason: ${reason}`,
      },
    });

    return successResponse({
      message: `User ${report.reportedName} has been banned`,
      ban,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return errorResponse(message, 500);
  }
}
