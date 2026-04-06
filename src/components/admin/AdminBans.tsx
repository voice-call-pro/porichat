'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Plus, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
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

interface BanItem {
  id: string
  fingerprint: string
  reason: string
  type: 'temporary' | 'permanent'
  createdAt: string
  expiresAt: string | null
  active: boolean
  userName?: string
}

export default function AdminBans() {
  const language = useAppStore((s) => s.language)
  const [bans, setBans] = useState<BanItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showManualForm, setShowManualForm] = useState(false)
  const [fingerprint, setFingerprint] = useState('')
  const [reason, setReason] = useState('')
  const [duration, setDuration] = useState('permanent')
  const [submitting, setSubmitting] = useState(false)

  const fetchBans = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/bans')
      if (res.ok) {
        const data = await res.json()
        setBans(Array.isArray(data) ? data : data.bans || [])
      }
    } catch {
      // fallback
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBans()
  }, [fetchBans])

  const handleManualBan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fingerprint || !reason) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/bans/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fingerprint, reason, duration }),
      })
      if (res.ok) {
        toast.success(t('success', language))
        setFingerprint('')
        setReason('')
        setShowManualForm(false)
        fetchBans()
      } else {
        toast.error(t('error', language))
      }
    } catch {
      toast.error(t('error', language))
    } finally {
      setSubmitting(false)
    }
  }

  const handleRevoke = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/bans/${id}/revoke`, { method: 'POST' })
      if (res.ok) {
        toast.success(t('success', language))
        fetchBans()
      } else {
        toast.error(t('error', language))
      }
    } catch {
      toast.error(t('error', language))
    }
  }

  const activeBans = bans.filter((b) => b.active)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-red-500" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="neo-card-sm p-4 text-center">
          <p className="text-2xl font-bold text-red-500">{activeBans.length}</p>
          <p className="text-xs text-muted-foreground">{t('activeBans', language)}</p>
        </div>
        <div className="neo-card-sm p-4 text-center">
          <p className="text-2xl font-bold">{bans.length}</p>
          <p className="text-xs text-muted-foreground">{t('banHistory', language)}</p>
        </div>
      </div>

      {/* Manual ban */}
      <div className="neo-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{t('manualBan', language)}</h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowManualForm(!showManualForm)}
            className="neo-button gap-1"
          >
            <Plus className="w-4 h-4" />
            {t('manualBan', language)}
          </Button>
        </div>

        {showManualForm && (
          <form onSubmit={handleManualBan} className="space-y-3 neo-card-inset-sm p-4">
            <div className="space-y-1.5">
              <Label className="text-xs">{t('fingerprint', language)}</Label>
              <Input
                value={fingerprint}
                onChange={(e) => setFingerprint(e.target.value)}
                placeholder="abc123def456..."
                className="neo-input text-sm"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('banReason', language)}</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason for ban..."
                className="neo-input text-sm min-h-[60px] resize-none"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('banDuration', language)}</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="neo-input border-none text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="permanent">{t('permanent', language)}</SelectItem>
                  <SelectItem value="1h">1 Hour</SelectItem>
                  <SelectItem value="24h">24 Hours</SelectItem>
                  <SelectItem value="7d">7 Days</SelectItem>
                  <SelectItem value="30d">30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={submitting} className="neo-accent-red text-white text-sm flex-1">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('banUser', language)}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowManualForm(false)} className="neo-button text-sm">
                {t('cancel', language)}
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Active bans */}
      <div className="neo-card p-4 space-y-3">
        <h3 className="font-semibold">{t('activeBans', language)}</h3>
        {activeBans.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No active bans</p>
        ) : (
          <div className="space-y-2">
            {activeBans.map((ban) => (
              <div key={ban.id} className="neo-card-inset-sm p-3 flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">
                    {ban.userName || ban.fingerprint.substring(0, 16) + '...'}
                  </p>
                  <p className="text-xs text-muted-foreground">{ban.reason}</p>
                  <p className="text-[10px] text-muted-foreground">{ban.createdAt}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`${ban.type === 'permanent' ? 'bg-red-500' : 'bg-yellow-500'} text-white text-[10px]`}>
                    {ban.type === 'permanent' ? t('permanent', language) : t('temporary', language)}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRevoke(ban.id)}
                    className="text-xs h-7 text-green-500"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    {t('revoke', language)}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
