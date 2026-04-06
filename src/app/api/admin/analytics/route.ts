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

    // Parse query params
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from') || undefined;
    const to = searchParams.get('to') || undefined;
    const metric = searchParams.get('metric') || undefined;

    // Build where clause
    const where: Record<string, unknown> = {};
    if (from || to) {
      const dateFilter: Record<string, unknown> = {};
      if (from) {
        dateFilter.gte = from;
      }
      if (to) {
        dateFilter.lte = to;
      }
      where.date = dateFilter;
    }
    if (metric) {
      where.metric = metric;
    }

    const analytics = await db.analytics.findMany({
      where,
      orderBy: [{ date: 'asc' }, { metric: 'asc' }],
    });

    return successResponse({ analytics });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return errorResponse(message, 500);
  }
}
