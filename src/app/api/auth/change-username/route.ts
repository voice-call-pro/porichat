import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/response';
import { changeUsernameSchema } from '@/lib/validation';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const parsed = changeUsernameSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return errorResponse(firstError?.message || 'Invalid input', 400);
    }

    const { username, fingerprint } = parsed.data;

    const authHeader = request.headers.get('Authorization');

    // If fingerprint is provided, update anonymous user
    if (fingerprint) {
      const anonUser = await db.anonymousUser.findFirst({
        where: { fingerprintHash:fingerprint },
      });

      if (!anonUser) {
        return errorResponse('Anonymous user not found', 404);
      }

      const updated = await db.anonymousUser.update({
        where: { id: anonUser.id },
        data: { username },
      });

      return successResponse({
        user: {
          id: updated.id,
          username: updated.username,
          gender: updated.gender,
        },
      });
    }

    // Otherwise, use JWT token for registered user
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse('Authorization token or fingerprint required', 401);
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    const updated = await db.user.update({
      where: { id: payload.userId },
      data: { name: username },
      select: { id: true, name: true, email: true, role: true },
    });

    return successResponse({ user: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return errorResponse(message, 500);
  }
}
