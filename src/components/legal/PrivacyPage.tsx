'use client'

import { motion } from 'framer-motion'
import { ArrowLeft, Shield } from 'lucide-react'
import { useAppStore } from '@/store/use-app-store'
import { t } from '@/lib/i18n'

export default function PrivacyPage() {
  const language = useAppStore((s) => s.language)
  const navigateTo = useAppStore((s) => s.navigateTo)

  const sections = [
    {
      title: t('privacyCollect', language),
      items: [
        t('privacyCollect1', language),
        t('privacyCollect2', language),
        t('privacyCollect3', language),
        t('privacyCollect4', language),
      ],
    },
    {
      title: t('privacyUse', language),
      items: [
        t('privacyUse1', language),
        t('privacyUse2', language),
        t('privacyUse3', language),
        t('privacyUse4', language),
      ],
    },
    {
      title: t('privacyShare', language),
      items: [
        t('privacyShare1', language),
        t('privacyShare2', language),
        t('privacyShare3', language),
      ],
    },
    {
      title: t('privacyRights', language),
      items: [
        t('privacyRights1', language),
        t('privacyRights2', language),
        t('privacyRights3', language),
      ],
    },
  ]

  return (
    <div className="min-h-[calc(100vh-8rem)] px-4 py-8 sm:py-12">
      <div className="max-w-3xl mx-auto space-y-6">
        <button
          onClick={() => navigateTo('home')}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('back', language)}
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="neo-card p-6 sm:p-8 space-y-6"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Shield className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">{t('privacyTitle', language)}</h1>
              <p className="text-xs text-muted-foreground">{t('privacyLastUpdated', language)}</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            {t('privacyIntro', language)}
          </p>

          {sections.map((section, sIdx) => (
            <motion.div
              key={sIdx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + sIdx * 0.1 }}
              className="neo-card-sm p-4 space-y-3"
            >
              <h2 className="font-semibold text-lg">{section.title}</h2>
              <ul className="space-y-2">
                {section.items.map((item, iIdx) => (
                  <li key={iIdx} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="neo-card-sm p-4 space-y-2"
          >
            <h2 className="font-semibold text-lg">{t('privacySecurity', language)}</h2>
            <p className="text-sm text-muted-foreground">{t('privacySecurityDesc', language)}</p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
