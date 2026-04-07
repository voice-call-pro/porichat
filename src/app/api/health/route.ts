import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { SessionStatus } from '@prisma/client'

export async function GET() {
  try {
    const startTime = Date.now()
    await db.$queryRaw`SELECT 1`
    const dbLatency = Date.now() - startTime

    const [totalUsers, activeChats, totalBans] = await Promise.all([
      db.user.count(),

      db.chatSession.count({
        where: { status: SessionStatus.ACTIVE },
      }),

      db.ban.count({ where: { isActive: true } }),
    ])

    return NextResponse.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: dbLatency < 1000 ? 'healthy' : 'degraded',
          latencyMs: dbLatency,
        },
      },
      metrics: {
        totalUsers,
        activeChats,
        activeBans: totalBans,
      },
      version: '1.0.0',
      uptime: process.uptime(),
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 503 })
  }
}
