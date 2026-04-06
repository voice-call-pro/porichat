'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useAppStore } from '@/store/use-app-store'
import { t } from '@/lib/i18n'

interface ReportDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (reason: string, description: string) => void
  onCancelMatch?: boolean
}

const reportReasons = [
  { value: 'spam', labelKey: 'reportSpam' as const },
  { value: 'abuse', labelKey: 'reportAbuse' as const },
  { value: 'nsfw', labelKey: 'reportNsfw' as const },
  { value: 'other', labelKey: 'reportOther' as const },
]

export default function ReportDialog({
  open,
  onClose,
  onSubmit,
  onCancelMatch,
}: ReportDialogProps) {
  const language = useAppStore((s) => s.language)
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!reason) return
    setSubmitting(true)
    try {
      await onSubmit(reason, description)
      setReason('')
      setDescription('')
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="neo-card border-none max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            {t('reportTitle', language)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Reason selection */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              {t('reportReason', language)}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {reportReasons.map((r) => (
                <motion.button
                  key={r.value}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setReason(r.value)}
                  className={`neo-button p-3 text-sm text-left transition-all ${
                    reason === r.value
                      ? 'bg-red-500/10 text-red-600 dark:text-red-400 ring-2 ring-red-500/50'
                      : 'text-foreground'
                  }`}
                >
                  {t(r.labelKey, language)}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              {t('reportDescription', language)}
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('reportDescriptionPlaceholder', language)}
              className="neo-input min-h-[80px] resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 neo-button"
            >
              {t('cancel', language)}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!reason || submitting}
              className="flex-1 neo-accent-red text-white"
            >
              {t('reportSubmit', language)}
            </Button>
          </div>

          {onCancelMatch && (
            <p className="text-xs text-muted-foreground text-center">
              {t('reportCancelMatch', language)}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
