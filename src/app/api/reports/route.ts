import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/response';
import { reportSchema } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const parsed = reportSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return errorResponse(firstError?.message || 'Invalid input', 400);
    }

    const {
      reportedId,
      reportedType,
      reportedName,
      reason,
      description,
      fingerprint,
      ipAddress,
      chatSessionId,
    } = parsed.data;

    // Create report — no auth required for anonymous users
    const report = await db.report.create({
      data: {
        reportedId,
        reportedType: reportedType || 'anonymous',
        reportedName,
        reason,
        description: description || null,
        fingerprint: fingerprint || null,
        ipAddress: ipAddress || null,
        chatSessionId: chatSessionId || null,
      },
    });

    // Create system log for the report
    await db.systemLog.create({
      data: {
        level: 'warning',
        action: 'user_reported',
        details: `New report created: ${reportedName} (${reportedType}:${reportedId}). Reason: ${reason}. Description: ${description || 'None'}`,
      },
    });

    return successResponse({
      message: 'Report submitted successfully',
      reportId: report.id,
    }, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return errorResponse(message, 500);
  }
}
