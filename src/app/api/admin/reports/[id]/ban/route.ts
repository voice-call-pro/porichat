import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { adminAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/response';
import { banFromReportSchema } from '@/lib/validation';
import { BanType, LogLevel, UserType, ReportStatus } from '@prisma/client';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 🔐 Verify admin authentication
    const admin = await adminAuth(request);
    if (!admin) {
      return errorResponse('Unauthorized', 401);
    }

    const { id } = await params;
    const body = await request.json();

    // ✅ Validate input
    const parsed = banFromReportSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return errorResponse(firstError?.message || 'Invalid input', 400);
    }

    const { type, duration, reason } = parsed.data;

    // 🔄 Convert type → enum
    const finalType =
      type === 'temporary'
        ? BanType.TEMPORARY
        : BanType.PERMANENT;

    // 🔍 Find report
    const report = await db.report.findUnique({
      where: { id },
    });

    if (!report) {
      return errorResponse('Report not found', 404);
    }

    // ⏳ Expiry calculation
    const expiresAt =
      finalType === BanType.TEMPORARY && duration
        ? new Date(Date.now() + duration * 1000)
        : null;

    // 🚫 Create Ban
    const ban = await db.ban.create({
      data: {
        userId: report.reportedId || undefined,
        userType: report.reportedType,
        anonId: report.anonReportedId || undefined,
        fingerprintHash: report.fingerprintHash || undefined,
        ipHash: report.ipHash || undefined,
        reason,
        type: finalType,
        duration: duration || null,
        expiresAt,
        bannedById: admin.id,
      },
    });

    // ✅ Mark report resolved
    await db.report.update({
      where: { id },
      data: {
        status: ReportStatus.RESOLVED,
        updatedAt: new Date(),
      },
    });

    // 🚫 Update user ban status
    if (
      report.reportedType === UserType.REGISTERED &&
      report.reportedId
    ) {
      await db.user.update({
        where: { id: report.reportedId },
        data: { isBanned: true },
      });
    } else if (
      report.reportedType === UserType.ANONYMOUS &&
      report.anonReportedId
    ) {
      await db.anonymousUser.updateMany({
        where: { id: report.anonReportedId },
        data: { isBanned: true },
      });
    }

    // 🧾 Log action
    await db.systemLog.create({
      data: {
        level: LogLevel.WARN,
        action: 'ban_from_report',
        userId: admin.id,
        userType: UserType.REGISTERED,
        details: `${admin.name} banned ${
          report.reportedId || report.anonReportedId || 'unknown'
        } from report ${id}. Type: ${finalType}, Duration: ${
          duration || 'permanent'
        }. Reason: ${reason}`,
      },
    });

    return successResponse({
      message: `User has been banned`,
      ban,
    });

  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Internal server error';

    return errorResponse(message, 500);
  }
}
