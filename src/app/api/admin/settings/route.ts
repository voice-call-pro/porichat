import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { adminAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/response';
import { updateSettingSchema } from '@/lib/validation';
import { LogLevel, UserType } from '@prisma/client';

// GET all system settings
export async function GET(request: NextRequest) {
  try {
    const admin = await adminAuth(request);
    if (!admin) {
      return errorResponse('Unauthorized', 401);
    }

    const settings = await db.systemSetting.findMany({
      orderBy: { key: 'asc' },
    });

    return successResponse({ settings });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Internal server error';

    return errorResponse(message, 500);
  }
}

// PUT update a system setting
export async function PUT(request: NextRequest) {
  try {
    const admin = await adminAuth(request);
    if (!admin) {
      return errorResponse('Unauthorized', 401);
    }

    const body = await request.json();

    const parsed = updateSettingSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return errorResponse(firstError?.message || 'Invalid input', 400);
    }

    const { key, value } = parsed.data;

    const setting = await db.systemSetting.upsert({
      where: { key },
      update: { value, updatedAt: new Date() },
      create: { key, value },
    });

    // 🧾 FIXED LOG
    await db.systemLog.create({
      data: {
        level: LogLevel.INFO,
        action: 'setting_updated',
        userId: admin.id,
        userType: UserType.REGISTERED,
        details: `${admin.name} updated setting "${key}" to "${value}"`,
      },
    });

    return successResponse({
      message: `Setting "${key}" updated successfully`,
      setting,
    });

  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Internal server error';

    return errorResponse(message, 500);
  }
}
