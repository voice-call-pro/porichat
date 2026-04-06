import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { adminAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/response';
import { resolveReportSchema } from '@/lib/validation';

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
    const parsed = resolveReportSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return errorResponse(firstError?.message || 'Invalid input', 400);
    }

    const { action, note } = parsed.data;

    // Find report
    const report = await db.report.findUnique({
      where: { id },
    });

    if (!report) {
      return errorResponse('Report not found', 404);
    }

    // Update report status
    const newStatus = action === 'resolve' ? 'resolved' : 'dismissed';
    await db.report.update({
      where: { id },
      data: {
        status: newStatus,
        updatedAt: new Date(),
      },
    });

    // Log action
    await db.systemLog.create({
      data: {
        level: 'info',
        action: `report_${newStatus}`,
        userId: admin.id,
        userType: 'registered',
        details: `${admin.name} ${newStatus} report ${id}. Note: ${note || 'None'}. Reported user: ${report.reportedName} (${report.reportedId})`,
      },
    });

    return successResponse({
      message: `Report has been ${newStatus}`,
      reportId: id,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return errorResponse(message, 500);
  }
}
