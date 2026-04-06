'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Download, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAppStore } from '@/store/use-app-store'
import { t } from '@/lib/i18n'

interface LogItem {
  id: string
  level: 'info' | 'warn' | 'error'
  action: string
  userName: string
  details: string
  createdAt: string
}

export default function AdminLogs() {
  const language = useAppStore((s) => s.language)
  const [logs, setLogs] = useState<LogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [levelFilter, setLevelFilter] = useState<string>('all')

  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (levelFilter !== 'all') params.set('level', levelFilter)

      const res = await fetch(`/api/admin/logs?${params}`)
      if (res.ok) {
        const data = await res.json()
        setLogs(Array.isArray(data) ? data : data.logs || [])
      }
    } catch {
      // fallback
    } finally {
      setLoading(false)
    }
  }, [page, levelFilter])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const handleExport = () => {
    const text = logs
      .map((l) => `[${l.level.toUpperCase()}] ${l.createdAt} | ${l.userName} | ${l.action}: ${l.details}`)
      .join('\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `porichat-logs-${new Date().toISOString().split('T')[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const levelColor = (level: string) => {
    switch (level) {
      case 'error': return 'bg-red-500/10 text-red-600'
      case 'warn': return 'bg-yellow-500/10 text-yellow-600'
      default: return 'bg-blue-500/10 text-blue-600'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-red-500" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="neo-card-sm p-4 flex flex-wrap gap-3 items-center">
        <Select value={levelFilter} onValueChange={(v) => { setLevelFilter(v); setPage(1); }}>
          <SelectTrigger className="w-36 neo-input border-none">
            <SelectValue placeholder={t('filterByLevel', language)} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('all', language)}</SelectItem>
            <SelectItem value="info">{t('info', language)}</SelectItem>
            <SelectItem value="warn">{t('warn', language)}</SelectItem>
            <SelectItem value="error">{t('error_level', language)}</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchLogs}
          className="neo-button gap-1"
        >
          <RefreshCw className="w-3 h-3" />
          {t('refresh', language)}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          className="neo-button gap-1"
        >
          <Download className="w-3 h-3" />
          {t('export', language)}
        </Button>
      </div>

      {/* Logs */}
      {logs.length === 0 ? (
        <div className="neo-card p-8 text-center text-muted-foreground">
          No logs found
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="neo-card-sm p-3 flex flex-wrap items-start gap-3">
              <Badge className={`${levelColor(log.level)} text-[10px] shrink-0 mt-0.5`}>
                {log.level}
              </Badge>
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{log.action}</span>
                  <span className="text-[10px] text-muted-foreground">{log.userName}</span>
                </div>
                <p className="text-xs text-muted-foreground">{log.details}</p>
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0">{log.createdAt}</span>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="flex justify-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          className="neo-button"
        >
          {t('previous', language)}
        </Button>
        <span className="flex items-center text-sm text-muted-foreground px-3">Page {page}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => p + 1)}
          disabled={logs.length < 20}
          className="neo-button"
        >
          {t('next', language)}
        </Button>
      </div>
    </div>
  )
}
