'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Smile, ImagePlus, Phone, SkipForward, Flag, ArrowDown, Check, CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAppStore } from '@/store/use-app-store'
import { t } from '@/lib/i18n'
import { toast } from 'sonner'
import EmojiPicker from '@/components/shared/EmojiPicker'
import ReportDialog from '@/components/shared/ReportDialog'
import type { SocketMessage } from '@/hooks/use-socket'
import { format } from 'date-fns'

interface ChatRoomProps {
  messages: SocketMessage[]
  partnerName: string
  partnerTyping: boolean
  onSendMessage: (content: string) => void
  onTyping: () => void
  onStopTyping: () => void
  onNext: () => void
  onReport: (reason: string, description: string) => void
  onPartnerDisconnected?: boolean
}

export default function ChatRoom({
  messages,
  partnerName,
  partnerTyping,
  onSendMessage,
  onTyping,
  onStopTyping,
  onNext,
  onReport,
  onPartnerDisconnected,
}: ChatRoomProps) {
  const language = useAppStore((s) => s.language)
  const userId = useAppStore((s) => s.user?.id || useAppStore.getState().anonymousUser?.id || '')
  const anonymousUser = useAppStore((s) => s.anonymousUser)
  const [inputValue, setInputValue] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [hasNewMessages, setHasNewMessages] = useState(false)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior })
  }, [])

  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom()
    } else {
      setHasNewMessages(true)
    }
  }, [messages, isAtBottom, scrollToBottom])

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current
    if (!container) return
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 80
    setIsAtBottom(isNearBottom)
    if (isNearBottom) {
      setHasNewMessages(false)
    }
  }, [])

  const handleSend = useCallback(() => {
    const trimmed = inputValue.trim()
    if (!trimmed) return
    onSendMessage(trimmed)
    setInputValue('')
    setShowEmoji(false)
    onStopTyping()
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
  }, [inputValue, onSendMessage, onStopTyping])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value)
      onTyping()
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => {
        onStopTyping()
      }, 2000)
    },
    [onTyping, onStopTyping]
  )

  const handleEmojiSelect = useCallback(
    (emoji: string) => {
      setInputValue((prev) => prev + emoji)
    },
    []
  )

  const handleGifClick = useCallback(() => {
    toast.info(t('comingSoon', language))
  }, [language])

  const handleCallClick = useCallback(() => {
    toast.info(t('comingSoon', language))
  }, [language])

  const handleReportSubmit = useCallback(
    async (reason: string, description: string) => {
      onReport(reason, description)
      toast.success(t('reportSuccess', language))
      setShowReport(false)
    },
    [onReport, language]
  )

  const myName = useAppStore.getState().user?.name || anonymousUser?.username || 'You'

  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="neo-card-sm p-3 sm:p-4 flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white font-bold text-sm">
              {partnerName?.charAt(0).toUpperCase() || '?'}
            </div>
            <div
              className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background ${
                onPartnerDisconnected ? 'bg-gray-400' : 'bg-green-500'
              }`}
            />
          </div>
          <div>
            <p className="font-semibold text-sm">{partnerName || t('stranger', language)}</p>
            <p className="text-xs text-muted-foreground">
              {onPartnerDisconnected
                ? t('partnerDisconnected', language)
                : t('connected', language)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCallClick}
            className="h-9 w-9 text-muted-foreground hover:text-red-500"
          >
            <Phone className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 neo-card-inset relative overflow-hidden">
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="h-[calc(100vh-24rem)] sm:h-[calc(100vh-22rem)] overflow-y-auto p-4 space-y-3"
        >
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-8">
              <p>{t('conversationStarted', language)}</p>
              <p className="mt-1 text-xs">💡 Say hello!</p>
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg, idx) => {
              const isMine = msg.senderId === userId || msg.senderName === myName
              const isSystem = msg.type === 'system'

              if (isSystem) {
                return (
                  <motion.div
                    key={msg.id || idx}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-center"
                  >
                    <span className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                      {msg.content}
                    </span>
                  </motion.div>
                )
              }

              return (
                <motion.div
                  key={msg.id || idx}
                  initial={{ opacity: 0, y: 8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] sm:max-w-[70%] px-4 py-2.5 rounded-2xl ${
                      isMine
                        ? 'bg-red-500 text-white rounded-br-md'
                        : 'neo-card-sm rounded-bl-md'
                    }`}
                  >
                    <p className="text-sm break-words whitespace-pre-wrap">{msg.content}</p>
                    <div
                      className={`flex items-center gap-1 mt-1 ${
                        isMine ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <span
                        className={`text-[10px] ${
                          isMine ? 'text-red-100' : 'text-muted-foreground'
                        }`}
                      >
                        {msg.createdAt
                          ? format(new Date(msg.createdAt), 'HH:mm')
                          : ''}
                      </span>
                      {isMine && (
                        <CheckCheck className="w-3 h-3 text-red-200" />
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>

          {/* Typing indicator */}
          <AnimatePresence>
            {partnerTyping && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="flex justify-start"
              >
                <div className="neo-card-sm px-4 py-3 rounded-2xl rounded-bl-md">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground typing-dot" />
                    <div className="w-2 h-2 rounded-full bg-muted-foreground typing-dot" />
                    <div className="w-2 h-2 rounded-full bg-muted-foreground typing-dot" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={messagesEndRef} />
        </div>

        {/* New messages badge */}
        <AnimatePresence>
          {hasNewMessages && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-3 left-1/2 -translate-x-1/2"
            >
              <Button
                size="sm"
                onClick={() => {
                  scrollToBottom()
                  setHasNewMessages(false)
                }}
                className="neo-accent-red text-white gap-1 shadow-lg"
              >
                <ArrowDown className="w-3 h-3" />
                {t('newMessages', language)}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input area */}
      <div className="mt-2 space-y-2">
        <div className="neo-card-sm p-2 flex items-center gap-2">
          {/* Emoji button */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowEmoji(!showEmoji)}
              className="h-9 w-9 text-muted-foreground hover:text-yellow-500 shrink-0"
            >
              <Smile className="w-5 h-5" />
            </Button>
            <EmojiPicker
              isOpen={showEmoji}
              onClose={() => setShowEmoji(false)}
              onSelect={handleEmojiSelect}
            />
          </div>

          {/* GIF button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleGifClick}
            className="h-9 w-9 text-muted-foreground hover:text-purple-500 shrink-0"
          >
            <ImagePlus className="w-5 h-5" />
          </Button>

          {/* Input */}
          <Input
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={t('typeMessage', language)}
            className="neo-input flex-1 h-9 text-sm border-none"
          />

          {/* Send */}
          <motion.div whileTap={{ scale: 0.9 }}>
            <Button
              onClick={handleSend}
              disabled={!inputValue.trim()}
              size="icon"
              className="h-9 w-9 neo-accent-red text-white shrink-0 disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </Button>
          </motion.div>
        </div>

        {/* Bottom toolbar */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1">
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={onNext}
                className="gap-1.5 text-sm text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <SkipForward className="w-4 h-4" />
                <span className="hidden sm:inline">{t('next', language)}</span>
              </Button>
            </motion.div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowReport(true)}
              className="gap-1.5 text-sm text-muted-foreground hover:text-red-500 cursor-pointer"
            >
              <Flag className="w-4 h-4" />
              <span className="hidden sm:inline">{t('reportUser', language)}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Report dialog */}
      <ReportDialog
        open={showReport}
        onClose={() => setShowReport(false)}
        onSubmit={handleReportSubmit}
        onCancelMatch
      />
    </div>
  )
}
