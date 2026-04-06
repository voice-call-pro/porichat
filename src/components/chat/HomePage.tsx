'use client'

import { motion } from 'framer-motion'
import { Phone, MessageCircle, Shield, Zap, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store/use-app-store'
import { t } from '@/lib/i18n'
import AnimatedMascot from '@/components/shared/AnimatedMascot'
import { toast } from 'sonner'

interface HomePageProps {
  onLoggedInStartChat: () => void
}

export default function HomePage({ onLoggedInStartChat }: HomePageProps) {
  const language = useAppStore((s) => s.language)
  const navigateTo = useAppStore((s) => s.navigateTo)
  const user = useAppStore((s) => s.user)
  const setChatState = useAppStore((s) => s.setChatState)

  const handleStartChat = () => {
    if (!user) {
      setChatState('selecting-gender')
    } else {
      onLoggedInStartChat()
    }
  }

  const handleCallClick = () => {
    toast.info(t('comingSoon', language))
  }

  const features = [
    { icon: MessageCircle, labelKey: 'anonymous' as const, descKey: 'anonymousDesc' as const, color: 'text-red-500' },
    { icon: Globe, labelKey: 'random' as const, descKey: 'randomDesc' as const, color: 'text-blue-500' },
    { icon: Shield, labelKey: 'secure' as const, descKey: 'secureDesc' as const, color: 'text-green-500' },
    { icon: Zap, labelKey: 'fast' as const, descKey: 'fastDesc' as const, color: 'text-yellow-500' },
  ]

  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-2xl w-full text-center space-y-8"
      >
        {/* Mascot */}
        <div className="flex justify-center">
          <AnimatedMascot size="lg" />
        </div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-3">
            <span className="bg-gradient-to-r from-red-500 via-red-600 to-red-700 bg-clip-text text-transparent">
              {t('appName', language)}
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground">
            {t('appTagline', language)}
          </p>
        </motion.div>

        {/* Start Chat Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="neo-card p-6 sm:p-8 space-y-4"
        >
          <p className="text-muted-foreground text-sm">
            {t('startChatDesc', language)}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={handleStartChat}
                className="neo-accent-red text-white px-8 py-6 text-lg font-semibold cursor-pointer"
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                {t('startChat', language)}
              </Button>
            </motion.div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="outline"
                onClick={handleCallClick}
                className="neo-button px-6 py-6 cursor-pointer"
              >
                <Phone className="w-5 h-5 mr-2 text-red-500" />
                {t('startVoiceCall', language)}
              </Button>
            </motion.div>
          </div>

          {!user && (
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
              <button
                onClick={() => navigateTo('login')}
                className="hover:text-red-500 transition-colors underline-offset-4 hover:underline cursor-pointer"
              >
                {t('login', language)}
              </button>
              <span>·</span>
              <button
                onClick={() => navigateTo('signup')}
                className="hover:text-red-500 transition-colors underline-offset-4 hover:underline cursor-pointer"
              >
                {t('signup', language)}
              </button>
            </div>
          )}
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          <h3 className="text-lg font-semibold mb-4">{t('features', language)}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {features.map((feature, idx) => (
              <motion.div
                key={feature.labelKey}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + idx * 0.1 }}
                className="neo-card-sm p-4 text-center space-y-2"
              >
                <feature.icon className={`w-6 h-6 mx-auto ${feature.color}`} />
                <p className="text-sm font-medium">{t(feature.labelKey, language)}</p>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  {t(feature.descKey, language)}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
