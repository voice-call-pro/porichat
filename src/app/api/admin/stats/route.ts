import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { adminAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/response';

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const admin = await adminAuth(request);
    if (!admin) {
      return errorResponse('Unauthorized', 401);
    }

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Run all queries in parallel for performance
    const [
      totalUsers,
      totalAnonymousUsers,
      activeChats,
      totalReports,
      totalBans,
      recentReports,
      dailyActiveUsers,
    ] = await Promise.all([
      db.user.count(),
      db.anonymousUser.count(),
      db.chatSession.count({ where: { status: 'active' } }),
      db.report.count({ where: { createdAt: { gte: twentyFourHoursAgo } } }),
      db.ban.count({ where: { isActive: true } }),
      db.report.findMany({
        where: { createdAt: { gte: twentyFourHoursAgo } },
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          reporterName: true,
          reporterType: true,
          reportedId: true,
          reportedName: true,
          reportedType: true,
          reason: true,
          description: true,
          status: true,
          severity: true,
          createdAt: true,
        },
      }),
      db.user.count({ where: { lastSeen: { gte: twentyFourHoursAgo } } }),
    ]);

    return successResponse({
      stats: {
        totalUsers,
        totalAnonymousUsers,
        activeChats,
        totalReports,
        totalBans,
        recentReports,
        dailyActiveUsers,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return errorResponse(message, 500);
  }
}
