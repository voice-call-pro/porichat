'use client'

import { useEffect, useCallback, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAppStore } from '@/store/use-app-store'
import { useSocket } from '@/hooks/use-socket'
import { toast } from 'sonner'

import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import HomePage from '@/components/chat/HomePage'
import GenderSelect from '@/components/chat/GenderSelect'
import ChatLoader from '@/components/chat/ChatLoader'
import ChatRoom from '@/components/chat/ChatRoom'
import LoginPage from '@/components/auth/LoginPage'
import SignupPage from '@/components/auth/SignupPage'
import AboutPage from '@/components/legal/AboutPage'
import PrivacyPage from '@/components/legal/PrivacyPage'
import TermsPage from '@/components/legal/TermsPage'

import AdminLayout from '@/components/admin/AdminLayout'
import AdminDashboard from '@/components/admin/AdminDashboard'
import AdminReports from '@/components/admin/AdminReports'
import AdminUsers from '@/components/admin/AdminUsers'
import AdminBans from '@/components/admin/AdminBans'
import AdminLogs from '@/components/admin/AdminLogs'
import AdminSettings from '@/components/admin/AdminSettings'
import AdminAnalytics from '@/components/admin/AdminAnalytics'

export default function Home() {
  const {
    currentPage,
    chatState,
    setChatState,
    setPartnerInfo,
    setAnonymousUser,
    user,
  } = useAppStore()

  const [partnerName, setPartnerName] = useState('')
  const [partnerDisconnected, setPartnerDisconnected] = useState(false)

  const {
    isConnected,
    connect,
    disconnect,
    findMatch,
    cancelMatch,
    sendMessage,
    sendTyping,
    sendStopTyping,
    sendNext,
    reportUser,
    messages,
    partnerTyping,
    error: socketError,
  } = useSocket()

  // 🔥 helper (IMPORTANT FIX)
  const mapPartnerType = (type: string) =>
    type === 'registered' ? 'REGISTERED' : 'ANONYMOUS'

  // Socket error toast
  useEffect(() => {
    if (socketError) toast.error(socketError)
  }, [socketError])

  // =============================
  // 🎯 Gender select (ANON USER)
  // =============================
  const handleGenderSelect = useCallback(
    (gender: 'MALE' | 'FEMALE') => {
      const anonymousName = `Stranger_${Math.floor(Math.random() * 9000) + 1000}`

      setAnonymousUser({
        id: `anon_${Date.now()}`,
        username: anonymousName,
        gender,
        fingerprint: '',
      })

      connect(
        {
          anonymousName,
          gender,
        },
        {
          onMatched: (data) => {
            setPartnerName(data.partner.name)
            setPartnerDisconnected(false)

            // ✅ FIXED
            setPartnerInfo({
              id: data.partner.id,
              name: data.partner.name,
              type: mapPartnerType(data.partner.type),
            })

            setChatState('matched')
          },

          onPartnerDisconnected: () => {
            setPartnerDisconnected(true)
          },

          onMatchTimeout: () => {
            toast.error('Could not find a match')
            setChatState('idle')
          },

          onError: (err) => {
            toast.error(err.message)
          },

          onBanned: (data) => {
            toast.error(`Banned: ${data.reason}`)
            setChatState('idle')
            disconnect()
          },
        }
      )

      setChatState('connecting')
    },
    [connect, setAnonymousUser, setChatState, setPartnerInfo, disconnect]
  )

  // =============================
  // 🎯 LOGGED USER
  // =============================
  const handleLoggedInStartChat = useCallback(() => {
    if (!user) {
      setChatState('selecting-gender')
      return
    }

    connect(
      { token: user.token },
      {
        onMatched: (data) => {
          setPartnerName(data.partner.name)
          setPartnerDisconnected(false)

          // ✅ FIXED
          setPartnerInfo({
            id: data.partner.id,
            name: data.partner.name,
            type: mapPartnerType(data.partner.type),
          })

          setChatState('matched')
        },

        onPartnerDisconnected: () => {
          setPartnerDisconnected(true)
        },

        onMatchTimeout: () => {
          toast.error('Could not find a match')
          setChatState('idle')
        },

        onError: (err) => {
          toast.error(err.message)
        },

        onBanned: (data) => {
          toast.error(`Banned: ${data.reason}`)
          setChatState('idle')
          disconnect()
        },
      }
    )
  }, [user, connect, setChatState, setPartnerInfo, disconnect])

  // =============================
  // Auto find match
  // =============================
  useEffect(() => {
    if (chatState === 'connecting' && isConnected) {
      findMatch()
    }
  }, [chatState, isConnected, findMatch])

  // Cancel search
  const handleCancelSearch = useCallback(() => {
    cancelMatch()
    disconnect()
    setChatState('idle')
    setPartnerInfo(null)
  }, [cancelMatch, disconnect, setChatState, setPartnerInfo])

  // Next user
  const handleNext = useCallback(() => {
    sendNext()
    setPartnerDisconnected(false)
    setPartnerName('')
    setTimeout(() => findMatch(), 500)
  }, [sendNext, findMatch])

  // Report
  const handleReport = useCallback(
    (reason: string, description: string) => {
      reportUser(reason, description)
    },
    [reportUser]
  )

  // =============================
  // UI RENDER
  // =============================
  const renderContent = () => {
    if (chatState === 'selecting-gender') {
      return <GenderSelect onSelect={handleGenderSelect} onBack={() => setChatState('idle')} />
    }

    if (chatState === 'connecting') {
      return <ChatLoader onCancel={handleCancelSearch} />
    }

    if (chatState === 'matched') {
      return (
        <ChatRoom
          messages={messages}
          partnerName={partnerName}
          partnerTyping={partnerTyping}
          onSendMessage={sendMessage}
          onTyping={sendTyping}
          onStopTyping={sendStopTyping}
          onNext={handleNext}
          onReport={handleReport}
          onPartnerDisconnected={partnerDisconnected}
        />
      )
    }

    switch (currentPage) {
      case 'login':
        return <LoginPage />
      case 'signup':
        return <SignupPage />
      case 'about':
        return <AboutPage />
      case 'privacy':
        return <PrivacyPage />
      case 'terms':
        return <TermsPage />
      case 'admin':
      case 'admin-reports':
      case 'admin-users':
      case 'admin-bans':
      case 'admin-logs':
      case 'admin-settings':
      case 'admin-analytics':
        return (
          <AdminLayout>
            {currentPage === 'admin' && <AdminDashboard />}
            {currentPage === 'admin-reports' && <AdminReports />}
            {currentPage === 'admin-users' && <AdminUsers />}
            {currentPage === 'admin-bans' && <AdminBans />}
            {currentPage === 'admin-logs' && <AdminLogs />}
            {currentPage === 'admin-settings' && <AdminSettings />}
            {currentPage === 'admin-analytics' && <AdminAnalytics />}
          </AdminLayout>
        )
      default:
        return <HomePage onLoggedInStartChat={handleLoggedInStartChat} />
    }
  }

  const isChatPage =
    chatState === 'selecting-gender' ||
    chatState === 'connecting' ||
    chatState === 'matched'

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {!isChatPage && <Header />}

      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentPage}-${chatState}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {!isChatPage && <Footer />}
    </div>
  )
}
