'use client'

import { useTheme } from 'next-themes'
import { useState, useSyncExternalStore } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sun, Moon, Globe, Menu, X, LogOut, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { useAppStore, type PageName } from '@/store/use-app-store'
import { t, type Language } from '@/lib/i18n'
import AnimatedMascot from '@/components/shared/AnimatedMascot'

const navItems: { labelKey: 'home' | 'about' | 'privacyPolicy' | 'termsConditions' | 'login' | 'signup'; page: PageName }[] = [
  { labelKey: 'home', page: 'home' },
  { labelKey: 'about', page: 'about' },
  { labelKey: 'privacyPolicy', page: 'privacy' },
  { labelKey: 'termsConditions', page: 'terms' },
]

interface NavLinksProps {
  currentPage: PageName
  language: Language
  userRole: string | undefined
  mobile: boolean
  onNavigate: (page: PageName) => void
}

function NavLinks({ currentPage, language, userRole, mobile, onNavigate }: NavLinksProps) {
  return (
    <div className={mobile ? 'flex flex-col gap-3 mt-4' : 'flex items-center gap-1'}>
      {navItems.map((item) => (
        <motion.button
          key={item.page}
          whileTap={{ scale: 0.97 }}
          onClick={() => onNavigate(item.page)}
          className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
            currentPage === item.page
              ? 'bg-red-500/10 text-red-600 dark:text-red-400'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          } ${mobile ? 'text-left' : ''}`}
        >
          {t(item.labelKey, language)}
        </motion.button>
      ))}

      {userRole === 'admin' && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => onNavigate('admin')}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
            currentPage === 'admin' || currentPage.startsWith('admin-')
              ? 'bg-red-500/10 text-red-600 dark:text-red-400'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <Shield className="w-4 h-4" />
          {t('admin', language)}
        </motion.button>
      )}
    </div>
  )
}

export default function Header() {
  const { theme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(
    (onStoreChange) => {
      onStoreChange()
      return () => {}
    },
    () => true,
    () => false
  )
  const { currentPage, user, language, navigateTo, logout, toggleLanguage } = useAppStore()

  const handleNav = (page: PageName) => {
    navigateTo(page)
  }

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border/50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => handleNav('home')}
          className="flex items-center gap-2 cursor-pointer"
        >
          <AnimatedMascot size="sm" />
          <span className="text-xl font-bold bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent">
            PoriChat
          </span>
        </motion.button>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          <NavLinks
            currentPage={currentPage}
            language={language}
            userRole={user?.role}
            mobile={false}
            onNavigate={handleNav}
          />
        </nav>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          {/* Language toggle */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={toggleLanguage}
            className="neo-button-sm flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <Globe className="w-4 h-4" />
            <span className="hidden sm:inline">{language === 'en' ? 'BN' : 'EN'}</span>
          </motion.button>

          {/* Theme toggle */}
          {mounted && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="neo-button-sm p-2 rounded-xl text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              aria-label="Toggle theme"
            >
              <AnimatePresence mode="wait">
                {theme === 'dark' ? (
                  <motion.div
                    key="sun"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Sun className="w-5 h-5" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="moon"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Moon className="w-5 h-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          )}

          {/* Auth / User */}
          {user ? (
            <div className="hidden sm:flex items-center gap-2">
              <Avatar className="w-8 h-8 ring-2 ring-red-500/30">
                <AvatarFallback className="bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-bold">
                  {user.name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium max-w-[100px] truncate">
                {user.name}
              </span>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={logout}
                className="p-2 rounded-xl text-muted-foreground hover:text-red-500 transition-colors cursor-pointer"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
              </motion.button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleNav('login')}
                className="neo-button text-sm"
              >
                {t('login', language)}
              </Button>
              <Button
                size="sm"
                onClick={() => handleNav('signup')}
                className="neo-accent-red text-sm"
              >
                {t('signup', language)}
              </Button>
            </div>
          )}

          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="md:hidden p-2">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="neo-card border-none w-72">
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-4">
                  <AnimatedMascot size="sm" />
                  <span className="text-lg font-bold bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent">
                    PoriChat
                  </span>
                </div>

                <NavLinks
                  currentPage={currentPage}
                  language={language}
                  userRole={user?.role}
                  mobile={true}
                  onNavigate={handleNav}
                />

                <Separator className="my-4" />

                {user ? (
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 ring-2 ring-red-500/30">
                      <AvatarFallback className="bg-red-500/10 text-red-600 dark:text-red-400 font-bold">
                        {user.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={logout} className="text-red-500">
                      <LogOut className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleNav('login')}
                      className="neo-button w-full"
                    >
                      {t('login', language)}
                    </Button>
                    <Button
                      onClick={() => handleNav('signup')}
                      className="neo-accent-red w-full text-white"
                    >
                      {t('signup', language)}
                    </Button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
