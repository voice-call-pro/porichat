'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { useAppStore } from '@/store/use-app-store'
import { t } from '@/lib/i18n'
import AnimatedMascot from '@/components/shared/AnimatedMascot'

interface ChatLoaderProps {
  onCancel: () => void
}

export default function ChatLoader({ onCancel }: ChatLoaderProps) {
  const language = useAppStore((s) => s.language)

  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center space-y-8"
      >
        {/* Mascot */}
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <AnimatedMascot size="lg" />
        </motion.div>

        {/* Text */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-3"
        >
          <h2 className="text-2xl font-bold">{t('connecting', language)}</h2>
          <p className="text-muted-foreground text-sm">
            {t('connectingDesc', language)}
          </p>
        </motion.div>

        {/* Pulsing dots */}
        <div className="flex justify-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500 typing-dot" />
          <div className="w-3 h-3 rounded-full bg-red-500 typing-dot" />
          <div className="w-3 h-3 rounded-full bg-red-500 typing-dot" />
        </div>

        {/* Cancel button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Button
            variant="outline"
            onClick={onCancel}
            className="neo-button gap-2 cursor-pointer"
          >
            <X className="w-4 h-4" />
            {t('cancelSearch', language)}
          </Button>
        </motion.div>
      </motion.div>
    </div>
  )
}
