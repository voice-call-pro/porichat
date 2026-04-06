'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Flag,
  Users,
  Ban,
  FileText,
  Settings,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Shield,
  Wifi,
  WifiOff,
  Menu,
  X,
} from 'lucide-react'
import { useAppStore, type PageName } from '@/store/use-app-store'
import { t, type Language } from '@/lib/i18n'

interface AdminLayoutProps {
  children: React.ReactNode
}

const sidebarItems: { icon: typeof LayoutDashboard; labelKey: 'dashboard' | 'reports' | 'users' | 'banSystem' | 'logs' | 'settings' | 'analytics'; page: PageName }[] = [
  { icon: LayoutDashboard, labelKey: 'dashboard', page: 'admin' },
  { icon: Flag, labelKey: 'reports', page: 'admin-reports' },
  { icon: Users, labelKey: 'users', page: 'admin-users' },
  { icon: Ban, labelKey: 'banSystem', page: 'admin-bans' },
  { icon: FileText, labelKey: 'logs', page: 'admin-logs' },
  { icon: Settings, labelKey: 'settings', page: 'admin-settings' },
  { icon: BarChart3, labelKey: 'analytics', page: 'admin-analytics' },
]

interface SidebarContentProps {
  mobile: boolean
  collapsed: boolean
  currentPage: PageName
  language: Language
  systemOnline: boolean
  onNavigate: (page: PageName) => void
}

function SidebarContent({ mobile, collapsed, currentPage, language, systemOnline, onNavigate }: SidebarContentProps) {
  return (
    <div className={`flex flex-col h-full ${mobile ? 'w-64' : collapsed ? 'w-16' : 'w-56'} transition-all duration-300`}>
      {/* Logo */}
      <div className={`flex items-center gap-2 p-4 ${collapsed && !mobile ? 'justify-center' : ''}`}>
        <Shield className="w-6 h-6 text-red-500 shrink-0" />
        {!collapsed || mobile ? (
          <span className="font-bold text-sm text-red-500">Admin Panel</span>
        ) : null}
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-1 px-2">
        {sidebarItems.map((item) => {
          const isActive = currentPage === item.page
          return (
            <motion.button
              key={item.page}
              whileTap={{ scale: 0.97 }}
              onClick={() => onNavigate(item.page)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              } ${collapsed && !mobile ? 'justify-center' : ''}`}
              title={collapsed && !mobile ? t(item.labelKey, language) : undefined}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {(!collapsed || mobile) && <span>{t(item.labelKey, language)}</span>}
            </motion.button>
          )
        })}
      </nav>

      {/* System status */}
      {!mobile && (
        <div className="p-3">
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs ${
              systemOnline ? 'text-green-600 bg-green-500/10' : 'text-red-600 bg-red-500/10'
            }`}
          >
            {systemOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {collapsed ? null : t('operational', language)}
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const language = useAppStore((s) => s.language)
  const currentPage = useAppStore((s) => s.currentPage)
  const navigateTo = useAppStore((s) => s.navigateTo)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [systemOnline] = useState(true)

  const handleNavigate = (page: PageName) => {
    navigateTo(page)
    setMobileOpen(false)
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] flex">
      {/* Desktop sidebar */}
      <div className="hidden lg:block neo-card-inset rounded-r-2xl mr-3 relative overflow-hidden">
        <SidebarContent
          mobile={false}
          collapsed={collapsed}
          currentPage={currentPage}
          language={language}
          systemOnline={systemOnline}
          onNavigate={handleNavigate}
        />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-8 w-6 h-6 rounded-full neo-card flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors z-10 cursor-pointer"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </div>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-black/50 z-50 lg:hidden"
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed left-0 top-0 h-full neo-card z-50 lg:hidden rounded-r-2xl overflow-hidden"
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-4 p-1 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <SidebarContent
                mobile={true}
                collapsed={false}
                currentPage={currentPage}
                language={language}
                systemOnline={systemOnline}
                onNavigate={handleNavigate}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 neo-button-sm rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <motion.div
          key={currentPage}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {children}
        </motion.div>
      </div>
    </div>
  )
}
