'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store/use-app-store'
import { t } from '@/lib/i18n'

interface GenderSelectProps {
  onSelect: (gender: 'male' | 'female') => void
  onBack: () => void
}

export default function GenderSelect({ onSelect, onBack }: GenderSelectProps) {
  const language = useAppStore((s) => s.language)

  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center space-y-6"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="neo-card p-6 sm:p-8 space-y-6"
        >
          <div>
            <h2 className="text-2xl font-bold mb-2">{t('selectGender', language)}</h2>
            <p className="text-sm text-muted-foreground">
              {t('selectGenderDesc', language)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelect('male')}
              className="neo-card p-6 space-y-3 cursor-pointer group hover:ring-2 hover:ring-red-500/30 transition-all"
            >
              <div className="text-5xl">👨</div>
              <span className="text-lg font-semibold group-hover:text-red-500 transition-colors">
                {t('male', language)}
              </span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelect('female')}
              className="neo-card p-6 space-y-3 cursor-pointer group hover:ring-2 hover:ring-red-500/30 transition-all"
            >
              <div className="text-5xl">👩</div>
              <span className="text-lg font-semibold group-hover:text-red-500 transition-colors">
                {t('female', language)}
              </span>
            </motion.button>
          </div>

          <Button
            variant="ghost"
            onClick={onBack}
            className="text-muted-foreground hover:text-foreground cursor-pointer"
          >
            {t('back', language)}
          </Button>
        </motion.div>
      </motion.div>
    </div>
  )
}
