'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Eye, Ban, XCircle } from 'lucide-react'
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
import { toast } from 'sonner'

interface Report {
  id: string
  reporterName: string
  reportedName: string
  reason: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'pending' | 'resolved' | 'dismissed'
  description?: string
  createdAt: string
}

export default function AdminReports() {
  const language = useAppStore((s) => s.language)
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [reasonFilter, setReasonFilter] = useState<string>('all')

  const fetchReports = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: '10' })
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (reasonFilter !== 'all') params.set('reason', reasonFilter)

      const res = await fetch(`/api/admin/reports?${params}`)
      if (res.ok) {
        const data = await res.json()
        setReports(Array.isArray(data) ? data : data.reports || [])
      }
    } catch {
      // fallback empty
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, reasonFilter])

  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  const handleResolve = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/reports/${id}/resolve`, { method: 'POST' })
      if (res.ok) {
        toast.success(t('success', language))
        fetchReports()
      }
    } catch {
      toast.error(t('error', language))
    }
  }

  const handleBan = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/reports/${id}/ban`, { method: 'POST' })
      if (res.ok) {
        toast.success(t('success', language))
        fetchReports()
      }
    } catch {
      toast.error(t('error', language))
    }
  }

  const severityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500 text-white'
      case 'high': return 'bg-orange-500 text-white'
      case 'medium': return 'bg-yellow-500 text-white'
      default: return 'bg-green-500 text-white'
    }
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'bg-green-500/10 text-green-600'
      case 'dismissed': return 'bg-gray-500/10 text-gray-600'
      default: return 'bg-yellow-500/10 text-yellow-600'
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
      {/* Filters */}
      <div className="neo-card-sm p-4 flex flex-wrap gap-3 items-center">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40 neo-input border-none">
            <SelectValue placeholder={t('filterByStatus', language)} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('all', language)}</SelectItem>
            <SelectItem value="pending">{t('pending', language)}</SelectItem>
            <SelectItem value="resolved">{t('resolved', language)}</SelectItem>
            <SelectItem value="dismissed">{t('dismissed', language)}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={reasonFilter} onValueChange={(v) => { setReasonFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40 neo-input border-none">
            <SelectValue placeholder={t('filterByReason', language)} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('all', language)}</SelectItem>
            <SelectItem value="spam">{t('reportSpam', language)}</SelectItem>
            <SelectItem value="abuse">{t('reportAbuse', language)}</SelectItem>
            <SelectItem value="nsfw">{t('reportNsfw', language)}</SelectItem>
            <SelectItem value="other">{t('reportOther', language)}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Reports table */}
      {reports.length === 0 ? (
        <div className="neo-card p-8 text-center text-muted-foreground">
          No reports found
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div key={report.id} className="neo-card-sm p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {report.reporterName} → {report.reportedName}
                  </p>
                  <p className="text-xs text-muted-foreground">{report.createdAt}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`${severityColor(report.severity)} text-[10px]`}>
                    {report.severity}
                  </Badge>
                  <Badge className={`${statusColor(report.status)} text-[10px]`}>
                    {report.status}
                  </Badge>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium capitalize">{report.reason}</p>
                {report.description && (
                  <p className="text-xs text-muted-foreground mt-1">{report.description}</p>
                )}
              </div>

              {report.status === 'pending' && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleResolve(report.id)}
                    className="text-xs neo-button"
                  >
                    <XCircle className="w-3 h-3 mr-1" />
                    {t('dismiss', language)}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleBan(report.id)}
                    className="text-xs neo-accent-red text-white"
                  >
                    <Ban className="w-3 h-3 mr-1" />
                    {t('banUser', language)}
                  </Button>
                </div>
              )}
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
          disabled={reports.length < 10}
          className="neo-button"
        >
          {t('next', language)}
        </Button>
      </div>
    </div>
  )
}
