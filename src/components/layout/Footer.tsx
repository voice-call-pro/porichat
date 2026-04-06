'use client'

import { Heart, Mail, Globe } from 'lucide-react'
import { useAppStore } from '@/store/use-app-store'
import { t } from '@/lib/i18n'

export default function Footer() {
  const language = useAppStore((s) => s.language)
  const navigateTo = useAppStore((s) => s.navigateTo)

  return (
    <footer className="border-t border-border/50 bg-background/80 backdrop-blur-sm mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent">
                PoriChat
              </span>
            </div>
            <p className="text-sm text-muted-foreground max-w-xs">
              {t('appDescription', language)}
            </p>
          </div>

          {/* Links */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">{t('contactUs', language)}</h4>
            <div className="space-y-2">
              <a
                href="https://ai-multitool.netlify.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-red-500 transition-colors"
              >
                <Globe className="w-4 h-4" />
                ai-multitool.netlify.app
              </a>
              <a
                href="mailto:contact@porichat.com"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-red-500 transition-colors"
              >
                <Mail className="w-4 h-4" />
                contact@porichat.com
              </a>
            </div>
          </div>

          {/* Legal */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Legal</h4>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => navigateTo('about')}
                className="text-sm text-muted-foreground hover:text-red-500 transition-colors text-left"
              >
                {t('about', language)}
              </button>
              <button
                onClick={() => navigateTo('privacy')}
                className="text-sm text-muted-foreground hover:text-red-500 transition-colors text-left"
              >
                {t('privacyPolicy', language)}
              </button>
              <button
                onClick={() => navigateTo('terms')}
                className="text-sm text-muted-foreground hover:text-red-500 transition-colors text-left"
              >
                {t('termsConditions', language)}
              </button>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-6 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            © 2024 PoriChat. {t('aboutDeveloped', language)}
            <Heart className="w-3 h-3 text-red-500 fill-red-500" />
          </p>
          <a
            href="https://ai-multitool.netlify.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-red-500 transition-colors"
          >
            ai-multitool.netlify.app
          </a>
        </div>
      </div>
    </footer>
  )
}
