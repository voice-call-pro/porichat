'use client'

import { motion } from 'framer-motion'
import { MessageCircle, Shield, Zap, Globe, ArrowLeft, Crown } from 'lucide-react'
import { useAppStore } from '@/store/use-app-store'
import { t } from '@/lib/i18n'

export default function AboutPage() {
  const language = useAppStore((s) => s.language)
  const navigateTo = useAppStore((s) => s.navigateTo)

  const features = [
    { icon: MessageCircle, key: 'aboutFeature1' as const, color: 'text-red-500 bg-red-500/10' },
    { icon: Zap, key: 'aboutFeature2' as const, color: 'text-yellow-500 bg-yellow-500/10' },
    { icon: Shield, key: 'aboutFeature3' as const, color: 'text-green-500 bg-green-500/10' },
    { icon: Crown, key: 'aboutFeature4' as const, color: 'text-purple-500 bg-purple-500/10' },
    { icon: Globe, key: 'aboutFeature5' as const, color: 'text-blue-500 bg-blue-500/10' },
    { icon: Shield, key: 'aboutFeature6' as const, color: 'text-pink-500 bg-pink-500/10' },
  ]

  const steps = [
    { num: '1', key: 'aboutHow1' as const },
    { num: '2', key: 'aboutHow2' as const },
    { num: '3', key: 'aboutHow3' as const },
    { num: '4', key: 'aboutHow4' as const },
  ]

  return (
    <div className="min-h-[calc(100vh-8rem)] px-4 py-8 sm:py-12">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Back button */}
        <button
          onClick={() => navigateTo('home')}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('back', language)}
        </button>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3"
        >
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent">
            {t('aboutTitle', language)}
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {t('aboutDesc', language)}
          </p>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="neo-card p-6 space-y-4"
        >
          <h2 className="text-xl font-semibold">{t('aboutFeatures', language)}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {features.map((feat, idx) => (
              <motion.div
                key={feat.key}
                initial={{ opacity: 0, x: idx % 2 === 0 ? -10 : 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + idx * 0.1 }}
                className="neo-card-sm p-4 flex items-start gap-3"
              >
                <div className={`p-2 rounded-lg ${feat.color} shrink-0`}>
                  <feat.icon className="w-5 h-5" />
                </div>
                <p className="text-sm">{t(feat.key, language)}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* How it works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="neo-card p-6 space-y-4"
        >
          <h2 className="text-xl font-semibold">{t('aboutHowTitle', language)}</h2>
          <div className="space-y-3">
            {steps.map((step, idx) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + idx * 0.1 }}
                className="flex items-center gap-4"
              >
                <div className="w-8 h-8 rounded-full neo-accent-red text-white flex items-center justify-center text-sm font-bold shrink-0">
                  {step.num}
                </div>
                <p className="text-sm">{t(step.key, language)}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
