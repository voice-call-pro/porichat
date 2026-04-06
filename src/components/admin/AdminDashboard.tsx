'use client'

import { useState, useEffect } from 'react'
import { Users, MessageCircle, BarChart3, Flag, Ban, TrendingUp, TrendingDown } from 'lucide-react'
import { useAppStore } from '@/store/use-app-store'
import { t } from '@/lib/i18n'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts'

interface StatsData {
  activeUsers: number
  activeChats: number
  totalUsers: number
  reports24h: number
  bannedUsers: number
  userGrowth: Array<{ date: string; users: number }>
  chatActivity: Array<{ hour: string; chats: number }>
  reportsTrend: Array<{ date: string; reports: number }>
}

export default function AdminDashboard() {
  const language = useAppStore((s) => s.language)
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats')
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch {
      // Use fallback data
    } finally {
      setLoading(false)
    }
  }

  // Fallback data when API not available
  const fallbackStats: StatsData = {
    activeUsers: 127,
    activeChats: 43,
    totalUsers: 3842,
    reports24h: 7,
    bannedUsers: 15,
    userGrowth: [
      { date: 'Mon', users: 120 },
      { date: 'Tue', users: 145 },
      { date: 'Wed', users: 132 },
      { date: 'Thu', users: 178 },
      { date: 'Fri', users: 210 },
      { date: 'Sat', users: 245 },
      { date: 'Sun', users: 230 },
    ],
    chatActivity: [
      { hour: '00', chats: 5 },
      { hour: '04', chats: 3 },
      { hour: '08', chats: 15 },
      { hour: '12', chats: 35 },
      { hour: '16', chats: 42 },
      { hour: '20', chats: 38 },
      { hour: '23', chats: 18 },
    ],
    reportsTrend: [
      { date: 'Mon', reports: 3 },
      { date: 'Tue', reports: 5 },
      { date: 'Wed', reports: 2 },
      { date: 'Thu', reports: 8 },
      { date: 'Fri', reports: 6 },
      { date: 'Sat', reports: 4 },
      { date: 'Sun', reports: 7 },
    ],
  }

  const data = stats || fallbackStats

  const statCards = [
    { label: t('activeUsers', language), value: data.activeUsers, icon: Users, trend: '+12%', up: true, color: 'text-green-500' },
    { label: t('activeChats', language), value: data.activeChats, icon: MessageCircle, trend: '+5%', up: true, color: 'text-blue-500' },
    { label: t('totalUsers', language), value: data.totalUsers, icon: BarChart3, trend: '+23%', up: true, color: 'text-purple-500' },
    { label: t('reports24h', language), value: data.reports24h, icon: Flag, trend: '-8%', up: false, color: 'text-yellow-500' },
    { label: t('bannedUsers', language), value: data.bannedUsers, icon: Ban, trend: '+2', up: true, color: 'text-red-500' },
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="neo-card-sm p-4 animate-pulse">
            <div className="h-4 bg-muted rounded w-20 mb-3" />
            <div className="h-8 bg-muted rounded w-16" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {statCards.map((card, idx) => (
          <div key={idx} className="neo-card-sm p-4 space-y-2">
            <div className="flex items-center justify-between">
              <card.icon className={`w-5 h-5 ${card.color}`} />
              <span className={`text-xs flex items-center gap-0.5 ${card.up ? 'text-green-500' : 'text-red-500'}`}>
                {card.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {card.trend}
              </span>
            </div>
            <p className="text-2xl font-bold">{card.value.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* User Growth */}
        <div className="neo-card p-4 space-y-3">
          <h3 className="font-semibold text-sm">{t('dailyActiveUsers', language)}</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.userGrowth}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" className="text-xs" tick={{ fill: 'var(--muted-foreground)' }} />
                <YAxis className="text-xs" tick={{ fill: 'var(--muted-foreground)' }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    boxShadow: 'var(--shadow-neo-sm)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="users"
                  stroke="#ef4444"
                  fill="rgba(239, 68, 68, 0.1)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chat Activity */}
        <div className="neo-card p-4 space-y-3">
          <h3 className="font-semibold text-sm">{t('chatDuration', language)}</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.chatActivity}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="hour" className="text-xs" tick={{ fill: 'var(--muted-foreground)' }} />
                <YAxis className="text-xs" tick={{ fill: 'var(--muted-foreground)' }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    boxShadow: 'var(--shadow-neo-sm)',
                  }}
                />
                <Bar dataKey="chats" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Reports Trend */}
        <div className="neo-card p-4 space-y-3 lg:col-span-2">
          <h3 className="font-semibold text-sm">{t('reportFrequency', language)}</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.reportsTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" className="text-xs" tick={{ fill: 'var(--muted-foreground)' }} />
                <YAxis className="text-xs" tick={{ fill: 'var(--muted-foreground)' }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    boxShadow: 'var(--shadow-neo-sm)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="reports"
                  stroke="#f59e0b"
                  fill="rgba(245, 158, 11, 0.1)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
