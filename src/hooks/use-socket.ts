'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

interface SocketEventHandlers {
  onMatched?: (data: { partner: { id: string; name: string; type: string }; sessionId: string }) => void
  onPartnerDisconnected?: (data: { message: string }) => void
  onMatchTimeout?: () => void
  onError?: (data: { message: string }) => void
  onBanned?: (data: { reason: string }) => void
}

export interface SocketMessage {
  id: string
  senderId: string
  senderName: string
  content: string
  type: 'text' | 'system' | 'gif'
  createdAt: string
}

function generateFingerprint(): string {
  try {
    const data = {
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      language: typeof navigator !== 'undefined' ? navigator.language : '',
      platform: typeof navigator !== 'undefined' ? navigator.platform : '',
      screenRes: typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : '',
      colorDepth: typeof screen !== 'undefined' ? screen.colorDepth : 24,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      hardwareConcurrency: typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 0 : 0,
      deviceMemory: typeof navigator !== 'undefined' ? (navigator as unknown as { deviceMemory?: number }).deviceMemory || 0 : 0,
      touchPoints: typeof navigator !== 'undefined' ? navigator.maxTouchPoints || 0 : 0,
    }

    const str = JSON.stringify(data)
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(36)
  } catch {
    return Math.random().toString(36).substring(2, 15)
  }
}

interface UseSocketReturn {
  isConnected: boolean
  isConnecting: boolean
  connect: (data: {
    token?: string
    fingerprint?: string
    anonymousName?: string
    gender?: string
  }, handlers?: SocketEventHandlers) => void
  disconnect: () => void
  findMatch: () => void
  cancelMatch: () => void
  sendMessage: (content: string, type?: string) => void
  sendTyping: () => void
  sendStopTyping: () => void
  sendMessageSeen: (messageId: string) => void
  sendNext: () => void
  reportUser: (reason: string, description: string) => void
  messages: SocketMessage[]
  partnerTyping: boolean
  error: string | null
}

export function useSocket(): UseSocketReturn {
  const socketRef = useRef<Socket | null>(null)
  const handlersRef = useRef<SocketEventHandlers>({})
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [messages, setMessages] = useState<SocketMessage[]>([])
  const [partnerTyping, setPartnerTyping] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const connect = useCallback((data: {
    token?: string
    fingerprint?: string
    anonymousName?: string
    gender?: string
  }, handlers?: SocketEventHandlers) => {
    if (socketRef.current?.connected) return

    setIsConnecting(true)
    setError(null)
    handlersRef.current = handlers || {}

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001'
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      timeout: 15000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      auth: {
        token: data.token || undefined,
        fingerprint: data.fingerprint || generateFingerprint(),
        anonymousName: data.anonymousName || undefined,
        gender: data.gender || undefined,
      },
    })

    socket.on('connect', () => {
      setIsConnected(true)
      setIsConnecting(false)
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
      setIsConnecting(false)
    })

    socket.on('connect_error', () => {
      setIsConnecting(false)
      setError('Connection failed')
    })

    socket.on('matched', (matchData: { partner: { id: string; name: string; type: string }; sessionId: string }) => {
      setMessages([])
      setPartnerTyping(false)
      setError(null)
      handlersRef.current.onMatched?.(matchData)
    })

    socket.on('chat_message', (msg: SocketMessage) => {
      setMessages((prev) => [...prev, msg])
    })

    socket.on('user_typing', () => {
      setPartnerTyping(true)
    })

    socket.on('user_stopped_typing', () => {
      setPartnerTyping(false)
    })

    socket.on('partner_disconnected', (data: { message: string }) => {
      setPartnerTyping(false)
      const systemMsg: SocketMessage = {
        id: `sys-${Date.now()}`,
        senderId: 'system',
        senderName: 'System',
        content: data.message || 'Stranger has disconnected',
        type: 'system',
        createdAt: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, systemMsg])
      handlersRef.current.onPartnerDisconnected?.(data)
    })

    socket.on('match_timeout', () => {
      handlersRef.current.onMatchTimeout?.()
    })

    socket.on('error', (err: { message: string }) => {
      setError(err.message)
      handlersRef.current.onError?.(err)
    })

    socket.on('banned', (banData: { reason: string }) => {
      setError(`Banned: ${banData.reason}`)
      handlersRef.current.onBanned?.(banData)
    })

    socketRef.current = socket
  }, [])

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
    }
    setIsConnected(false)
    setIsConnecting(false)
    setMessages([])
    setPartnerTyping(false)
    setError(null)
    handlersRef.current = {}
  }, [])

  const findMatch = useCallback(() => {
    socketRef.current?.emit('find_match')
  }, [])

  const cancelMatch = useCallback(() => {
    socketRef.current?.emit('cancel_match')
  }, [])

  const sendMessage = useCallback((content: string, type = 'text') => {
    socketRef.current?.emit('chat_message', { content, type })
  }, [])

  const sendTyping = useCallback(() => {
    socketRef.current?.emit('typing')
  }, [])

  const sendStopTyping = useCallback(() => {
    socketRef.current?.emit('stop_typing')
  }, [])

  const sendMessageSeen = useCallback((messageId: string) => {
    socketRef.current?.emit('message_seen', { messageId })
  }, [])

  const sendNext = useCallback(() => {
    socketRef.current?.emit('next')
    setMessages([])
    setPartnerTyping(false)
  }, [])

  const reportUser = useCallback((reason: string, description: string) => {
    socketRef.current?.emit('report_user', { reason, description })
  }, [])

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [])

  return {
    isConnected,
    isConnecting,
    connect,
    disconnect,
    findMatch,
    cancelMatch,
    sendMessage,
    sendTyping,
    sendStopTyping,
    sendMessageSeen,
    sendNext,
    messages,
    partnerTyping,
    error,
  }
}
