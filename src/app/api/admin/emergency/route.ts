import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { adminAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/response';
import { emergencySchema } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication — only admins (not moderators) can use emergency actions
    const admin = await adminAuth(request);
    if (!admin) {
      return errorResponse('Unauthorized', 401);
    }

    if (admin.role !== 'admin') {
      return errorResponse('Only admins can perform emergency actions', 403);
    }

    const body = await request.json();

    // Validate input
    const parsed = emergencySchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return errorResponse(firstError?.message || 'Invalid input', 400);
    }

    const { action } = parsed.data;

    const isLockedDown = action === 'lockdown';

    // Update lockdown setting using upsert
    await db.systemSetting.upsert({
      where: { key: 'lockdown_mode' },
      update: { value: isLockedDown ? 'true' : 'false', updatedAt: new Date() },
      create: { key: 'lockdown_mode', value: isLockedDown ? 'true' : 'false', description: 'System lockdown mode toggle' },
    });

    // Log action
    await db.systemLog.create({
      data: {
        level: isLockedDown ? 'critical' : 'info',
        action: isLockedDown ? 'lockdown_activated' : 'lockdown_deactivated',
        userId: admin.id,
        userType: 'registered',
        details: `${admin.name} ${isLockedDown ? 'activated' : 'deactivated'} lockdown mode`,
      },
    });

    return successResponse({
      message: isLockedDown ? 'Lockdown mode activated' : 'Lockdown mode deactivated',
      lockdown: isLockedDown,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return errorResponse(message, 500);
  }
}
