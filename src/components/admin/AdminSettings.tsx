'use client'

import { useState, useEffect } from 'react'
import { Save, AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAppStore } from '@/store/use-app-store'
import { t } from '@/lib/i18n'
import { toast } from 'sonner'

interface SystemSettings {
  chatEnabled: boolean
  reportSystemEnabled: boolean
  maintenanceMode: boolean
  rateLimit: number
  autoBanThreshold: number
}

export default function AdminSettings() {
  const language = useAppStore((s) => s.language)
  const [settings, setSettings] = useState<SystemSettings>({
    chatEnabled: true,
    reportSystemEnabled: true,
    maintenanceMode: false,
    rateLimit: 30,
    autoBanThreshold: 5,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings')
      if (res.ok) {
        const data = await res.json()
        setSettings((prev) => ({ ...prev, ...data }))
      }
    } catch {
      // Use defaults
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (res.ok) {
        toast.success(t('success', language))
      } else {
        toast.error(t('error', language))
      }
    } catch {
      toast.error(t('error', language))
    } finally {
      setSaving(false)
    }
  }

  const handleEmergency = async () => {
    if (!confirm('Are you sure? This will disable all chat functionality immediately.')) return
    try {
      const res = await fetch('/api/admin/emergency', { method: 'POST' })
      if (res.ok) {
        setSettings((prev) => ({
          ...prev,
          chatEnabled: false,
          maintenanceMode: true,
        }))
        toast.success('Emergency lockdown activated')
      } else {
        toast.error(t('error', language))
      }
    } catch {
      toast.error(t('error', language))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-red-500" />
      </div>
    )
  }

  const toggleItems = [
    {
      key: 'chatEnabled' as const,
      label: t('enableChat', language),
    },
    {
      key: 'reportSystemEnabled' as const,
      label: t('enableReports', language),
    },
    {
      key: 'maintenanceMode' as const,
      label: t('maintenanceMode', language),
    },
  ]

  return (
    <div className="space-y-4">
      {/* Toggles */}
      <div className="neo-card p-4 space-y-4">
        <h3 className="font-semibold">{t('settings', language)}</h3>
        <div className="space-y-4">
          {toggleItems.map((item) => (
            <div
              key={item.key}
              className="neo-card-inset-sm p-4 flex items-center justify-between"
            >
              <Label className="text-sm">{item.label}</Label>
              <Switch
                checked={settings[item.key]}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({ ...prev, [item.key]: checked }))
                }
              />
            </div>
          ))}
        </div>
      </div>

      {/* Rate limit & auto-ban */}
      <div className="neo-card p-4 space-y-4">
        <h3 className="font-semibold">Configuration</h3>
        <div className="space-y-3">
          <div className="neo-card-inset-sm p-4 space-y-2">
            <Label className="text-sm">{t('rateLimit', language)}</Label>
            <Input
              type="number"
              value={settings.rateLimit}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  rateLimit: parseInt(e.target.value) || 30,
                }))
              }
              className="neo-input w-32 text-sm"
              min={1}
              max={100}
            />
          </div>
          <div className="neo-card-inset-sm p-4 space-y-2">
            <Label className="text-sm">{t('autoBanThreshold', language)}</Label>
            <Input
              type="number"
              value={settings.autoBanThreshold}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  autoBanThreshold: parseInt(e.target.value) || 5,
                }))
              }
              className="neo-input w-32 text-sm"
              min={1}
              max={50}
            />
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex gap-3">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="neo-accent-red text-white gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {t('saveSettings', language)}
        </Button>
      </div>

      {/* Emergency */}
      <div className="neo-card p-4 space-y-3 border-2 border-red-500/30">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <h3 className="font-semibold text-red-500">{t('emergencyLockdown', language)}</h3>
        </div>
        <p className="text-xs text-muted-foreground">{t('emergencyLockdownDesc', language)}</p>
        <Button
          variant="destructive"
          onClick={handleEmergency}
          className="bg-red-600 hover:bg-red-700"
        >
          <AlertTriangle className="w-4 h-4 mr-2" />
          {t('emergencyLockdown', language)}
        </Button>
      </div>
    </div>
  )
}
