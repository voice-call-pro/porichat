import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/response';
import { reportSchema } from '@/lib/validation';
import { UserType, LogLevel } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const parsed = reportSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return errorResponse(firstError?.message || 'Invalid input', 400);
    }

    const {
      reportedId,
      reportedType,
      reason,
      description,
      fingerprint,
      ipAddress,
      chatSessionId,
    } = parsed.data;

    const report = await db.report.create({
      data: {
        reportedId,
        reportedType:
          reportedType === 'registered'
            ? UserType.REGISTERED          
          : UserType.ANONYMOUS,

        reason,
        description: description || null,

        fingerprintHash: fingerprint || null,
        ipHash: ipAddress || null,

        chatSessionId: chatSessionId || null,
      },
    });

    await db.systemLog.create({
      data: {
        level: LogLevel.WARN,
        action: 'user_reported',
        details: `New report created for ${reportedId}. Reason: ${reason}`,
      },
    });

    return successResponse(
      {
        message: 'Report submitted successfully',
        reportId: report.id,
      },
      201
    );

  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Internal server error';

    return errorResponse(message, 500);
  }
}
