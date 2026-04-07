import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { generateToken, comparePassword } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/response';
import { loginSchema } from '@/lib/validation';
import { LogLevel, UserType, UserRole } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // ✅ Validate input
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return errorResponse(firstError?.message || 'Invalid input', 400);
    }

    const { email, password } = parsed.data;

    // 🔍 Find user
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return errorResponse('Invalid email or password', 401);
    }

    // 🔐 Role check (FIXED)
    if (
      user.role !== UserRole.ADMIN &&
      user.role !== UserRole.MODERATOR
    ) {
      return errorResponse(
        'Access denied. Admin or moderator role required.',
        403
      );
    }

    // 🔑 Password check
    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return errorResponse('Invalid email or password', 401);
    }

    // 🎟️ Generate token
    const token = generateToken(user.id, user.role);

    // 🟢 Update status
    await db.user.update({
      where: { id: user.id },
      data: {
        isOnline: true,
        lastSeen: new Date(),
      },
    });

    // 🧾 Log login (FIXED)
    await db.systemLog.create({
      data: {
        level: LogLevel.INFO,
        action: 'admin_login',
        userId: user.id,
        userType: UserType.REGISTERED,
        details: `${user.name} logged in as ${user.role}`,
      },
    });

    return successResponse({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    });

  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Internal server error';

    return errorResponse(message, 500);
  }
}
