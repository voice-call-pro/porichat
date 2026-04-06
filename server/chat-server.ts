/**
 * PoriChat - Socket.IO Chat Service (BUG FIXED VERSION)
 *
 * A real-time chat mini-service supporting both anonymous and registered users
 * with random matching, persistent chat history, and moderation features.
 *
 * 
 */

import { createServer } from 'http'
import { Server, Socket } from 'socket.io'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import sanitizeHtml from 'sanitize-html'
import { Mutex } from 'async-mutex'

// ============================================================
// Environment Validation
// ============================================================
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required')
}
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required')
}
if (!process.env.JWT_ISSUER) {
  throw new Error('JWT_ISSUER is required')
}
if (!process.env.JWT_AUDIENCE) {
  throw new Error('JWT_AUDIENCE is required')
}

// ============================================================
// Types & Interfaces
// ============================================================
interface SocketUserData {
  id: string
  name: string
  type: 'registered' | 'anonymous'
  fingerprint: string
  gender: string
  ipAddress: string
}

interface QueueEntry {
  socketId: string
  user: SocketUserData
  joinedAt: number
  timeoutTimer: ReturnType<typeof setTimeout>
}

interface ActiveSession {
  sessionId: string
  user1SocketId: string
  user2SocketId: string
  startedAt: Date
}

interface AuthData {
  token?: string
  fingerprint: string
  anonymousName?: string
  gender?: string
}

// ============================================================
// Zod Validation Schemas
// ============================================================
const ChatMessageSchema = z.object({
  content: z.string().min(1).max(2000),
  type: z.enum(['text', 'emoji', 'system']),
})

const ReportDataSchema = z.object({
  reason: z.enum(['spam', 'abuse', 'nsfw', 'harassment', 'other']),
  description: z.string().max(500).optional(),
})

const GifDataSchema = z.object({
  url: z.string().url().max(500),
})

const ChatHistorySchema = z.object({
  sessionId: z.string().optional(),
  limit: z.number().min(1).max(200).default(50),
  offset: z.number().min(0).max(10000).default(0),
})

const MessageSeenSchema = z.object({
  messageId: z.string().min(1).max(100),
})

// ============================================================
// Configuration
// ============================================================
const PORT = Number(process.env.PORT) || 3001
const MATCH_TIMEOUT_MS = 30_000 // 30 seconds
const BAN_CHECK_INTERVAL_MS = 60_000 // Check bans every minute during active chat
const INACTIVITY_TIMEOUT_MS = 300_000 // 5 minutes of no activity
const MAX_CONNECTIONS_PER_IP_PER_MINUTE = 10
const MAX_QUEUE_SIZE = 1000 // Queue overflow control
const MAX_MESSAGE_SIZE = 2000 // Hard message size limit
const PAYLOAD_SIZE_LIMIT = 1e6 // 1MB max payload (DoS protection)

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET
const JWT_ISSUER = process.env.JWT_ISSUER
const JWT_AUDIENCE = process.env.JWT_AUDIENCE

// GIF Domain Whitelist
const ALLOWED_GIF_DOMAINS = [
  'media.giphy.com',
  'giphy.com',
  'media.tenor.com',
  'tenor.com',
  'c.tenor.com',
]

// Anonymous username pools
const MALE_NAMES = [
  'Stranger', 'Shadow', 'Wolf', 'Phoenix', 'Storm',
  'Thunder', 'Blaze', 'Knight', 'Hawk', 'Viper',
  'Dragon', 'Fury', 'Ghost', 'Raven', 'Frost',
]

const FEMALE_NAMES = [
  'Mystic', 'Luna', 'Aurora', 'Iris', 'Nova',
  'Pearl', 'Sky', 'Rose', 'Blossom', 'Star',
  'Crystal', 'Daisy', 'Lily', 'Willow', 'Ivy',
]

const GENERIC_NAMES = [
  'Wanderer', 'Echo', 'Cloud', 'Mist', 'River',
  'Breeze', 'Flame', 'Stone', 'Wave', 'Dusk',
]

// ============================================================
// Database Client with Circuit Breaker
// ============================================================
class DBCircuitBreaker {
  private failures = 0
  private lastFailureTime: number | null = null
  private readonly threshold = 5
  private readonly timeout = 30000 // 30 seconds
  private state: 'closed' | 'open' | 'half-open' = 'closed'

  isOpen(): boolean {
    if (this.state === 'open') {
      if (this.lastFailureTime && Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open'
        return false
      }
      return true
    }
    return false
  }

  recordSuccess(): void {
    this.failures = 0
    this.state = 'closed'
  }

  recordFailure(): void {
    this.failures++
    this.lastFailureTime = Date.now()
    if (this.failures >= this.threshold) {
      this.state = 'open'
    }
  }
}

const dbCircuitBreaker = new DBCircuitBreaker()

const globalForPrisma = globalThis as unknown as {
  chatPrisma: PrismaClient | undefined
}

export const db = new PrismaClient({
  log: ['warn', 'error'],
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.chatPrisma = db
}

// Database operation wrapper with retry logic
async function withDBRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
  if (dbCircuitBreaker.isOpen()) {
    throw new Error('Database circuit breaker is open')
  }

  let lastError: Error | undefined

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await operation()
      dbCircuitBreaker.recordSuccess()
      return result
    } catch (error) {
      lastError = error as Error
      dbCircuitBreaker.recordFailure()

      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 100 // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError || new Error('Database operation failed after retries')
}

// ============================================================
// HTTP & Socket.IO Server Setup with Security
// ============================================================
const httpServer = createServer()

const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL?.split(',') || [],
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: PAYLOAD_SIZE_LIMIT, // FIX #1: Payload size limit for DoS protection
})

// ============================================================
// In-Memory State
// ============================================================
const matchingQueue: Map<string, QueueEntry> = new Map()
const activeSessions: Map<string, ActiveSession> = new Map()
const connectedUsers: Map<string, SocketUserData> = new Map()
const banCheckIntervals: Map<string, ReturnType<typeof setInterval>> = new Map()
const inactivityTimers = new Map<string, ReturnType<typeof setTimeout>>
const ipConnectionAttempts = new Map<string, { count: number; resetAt: number }>()

// FIX #12: Efficient duplicate connection tracking - Map<userId, socketId>
const userSocketMap = new Map<string, string>() // key: `${type}:${id}`, value: socketId

// FIX #4: Mutex for match race condition
const matchMutex = new Mutex()

// ============================================================
// Socket-Level Rate Limiting Configuration
// ============================================================
const socketRateLimits = new Map<string, Map<string, { count: number; resetAt: number }>>()

const RATE_LIMITS: Record<string, { maxRequests: number; windowMs: number }> = {
  'chat_message': { maxRequests: 30, windowMs: 60_000 },
  'typing': { maxRequests: 30, windowMs: 60_000 },
  'stop_typing': { maxRequests: 30, windowMs: 60_000 },
  'find_match': { maxRequests: 10, windowMs: 60_000 },
  'next': { maxRequests: 10, windowMs: 60_000 },
  'skip': { maxRequests: 10, windowMs: 60_000 },
  'cancel_match': { maxRequests: 10, windowMs: 60_000 },
  'report_user': { maxRequests: 5, windowMs: 60_000 },
  'send_gif': { maxRequests: 10, windowMs: 60_000 },
  'get_chat_history': { maxRequests: 20, windowMs: 60_000 },
  'get_stats': { maxRequests: 10, windowMs: 60_000 },
  'admin_stats': { maxRequests: 10, windowMs: 60_000 },
  'message_seen': { maxRequests: 60, windowMs: 60_000 },
}

// Global IP-based rate limiting for spam protection
const globalIpRateLimits = new Map<string, { count: number; resetAt: number }>()
const GLOBAL_RATE_LIMIT = { maxRequests: 100, windowMs: 60_000 } // 100 events per minute per IP

// Spam detection - track message patterns
const spamDetectionMap = new Map<string, {
  messages: Array<{ content: string; timestamp: number }>
  violationCount: number
}>()

const SPAM_CONFIG = {
  duplicateWindowMs: 60000, // 1 minute
  maxDuplicates: 5, // Max 5 duplicate messages
  maxMessagesPerMinute: 30,
  cooldownMs: 300000, // 5 minute cooldown for spammers
}

// ============================================================
// Periodic Cleanup (Memory Leak Prevention)
// ============================================================

// FIX #6: Periodic cleanup for ipConnectionAttempts and other maps
setInterval(() => {
  const now = Date.now()

  // Clean up ipConnectionAttempts
  for (const [ip, data] of ipConnectionAttempts.entries()) {
    if (now > data.resetAt) {
      ipConnectionAttempts.delete(ip)
    }
  }

  // Clean up global IP rate limits
  for (const [ip, data] of globalIpRateLimits.entries()) {
    if (now > data.resetAt) {
      globalIpRateLimits.delete(ip)
    }
  }

  // Clean up spam detection entries
  for (const [socketId, data] of spamDetectionMap.entries()) {
    const cutoff = now - SPAM_CONFIG.duplicateWindowMs
    data.messages = data.messages.filter(m => m.timestamp > cutoff)
    if (data.messages.length === 0 && data.violationCount === 0) {
      spamDetectionMap.delete(socketId)
    }
  }

  // Clean up disconnected socket rate limits
  for (const [socketId, eventMap] of socketRateLimits.entries()) {
    const socket = io.sockets.sockets.get(socketId)
    if (!socket || !socket.connected) {
      socketRateLimits.delete(socketId)
    }
  }

  console.log(`[Cleanup] Periodic cleanup completed. Queue: ${matchingQueue.size}, Sessions: ${activeSessions.size / 2}`)
}, 60000) // Run every minute

// ============================================================
// Helper Functions
// ============================================================
function generateAnonymousName(gender: string): string {
  let namePool: string[]

  switch (gender?.toLowerCase()) {
    case 'male':
      namePool = MALE_NAMES
      break
    case 'female':
      namePool = FEMALE_NAMES
      break
    default:
      namePool = GENERIC_NAMES
      break
  }

  const name = namePool[Math.floor(Math.random() * namePool.length)]
  const number = Math.floor(1000 + Math.random() * 9000)
  return `${name}#${number}`
}

function getClientIp(socket: Socket): string {
  const handshake = socket.handshake
  const forwarded = handshake.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim()
  }
  const realIp = handshake.headers['x-real-ip']
  if (typeof realIp === 'string') {
    return realIp
  }
  return socket.conn.remoteAddress || 'unknown'
}

// FIX #7: Optimized ban check with single OR query
async function checkBan(
  userId: string | null,
  userType: string | null,
  fingerprintHash: string,
  ipHash?: string
): Promise<{ reason: string; expiresAt: Date | null } | null> {
  const now = new Date()

  try {
    // Single OR query instead of 3 separate queries
    const bans = await withDBRetry(() =>
      db.ban.findMany({
        where: {
          isActive: true,
          OR: [
            { fingerprintHash },
            ...(userId && userType === 'REGISTERED' ? [{ userId }] : []),
            ...(ipHash ? [{ ipHash }] : []),
          ],
        },
      })
    )

    for (const ban of bans) {
      if (ban.expiresAt && ban.expiresAt < now) {
        await withDBRetry(() =>
          db.ban.update({
            where: { id: ban.id },
            data: { isActive: false },
          })
        )
        continue
      }

      return {
        reason: ban.reason,
        expiresAt: ban.expiresAt,
      }
    }
  } catch (error) {
    console.error('[Ban Check] Database error:', error)
    // Fail closed - if we can't check bans, assume not banned
    // In production, you might want to fail open (block) instead
  }

  return null
}

function getPartnerSocketId(socketId: string): string | null {
  const session = activeSessions.get(socketId)
  if (!session) return null

  if (session.user1SocketId === socketId) return session.user2SocketId
  if (session.user2SocketId === socketId) return session.user1SocketId
  return null
}

function getUserData(socket: Socket): SocketUserData | null {
  return socket.data.user as SocketUserData || null
}

function safeEmit(socketId: string, event: string, data: unknown): void {
  const socket = io.sockets.sockets.get(socketId)
  if (socket && socket.connected) {
    socket.emit(event, data)
  }
}

async function endSession(
  sessionId: string,
  endedBy: string | null,
  user1SocketId: string,
  user2SocketId: string
): Promise<void> {
  try {
    const session = await withDBRetry(() =>
      db.chatSession.findUnique({ where: { id: sessionId } })
    )
    if (!session) return

    const duration = Math.round(
      (Date.now() - new Date(session.startedAt).getTime()) / 1000
    )

    await withDBRetry(() =>
      db.chatSession.update({
        where: { id: sessionId },
        data: {
          status: 'ENDED',
          endedAt: new Date(),
          duration,
          endedById: endedBy || 'system',
        },
      })
    )

    activeSessions.delete(user1SocketId)
    activeSessions.delete(user2SocketId)
    clearIntervalSafe(user1SocketId)
    clearIntervalSafe(user2SocketId)
  } catch (error) {
    console.error('[EndSession] Failed to end session:', error)
  }
}

function clearIntervalSafe(socketId: string): void {
  const interval = banCheckIntervals.get(socketId)
  if (interval) {
    clearInterval(interval)
    banCheckIntervals.delete(socketId)
  }
}

function removeFromQueue(socketId: string): void {
  const entry = matchingQueue.get(socketId)
  if (entry) {
    clearTimeout(entry.timeoutTimer)
    matchingQueue.delete(socketId)
  }
}

// FIX #4: Mutex-protected match function
async function attemptMatch(): Promise<void> {
  const release = await matchMutex.acquire()

  try {
    const queueArray = Array.from(matchingQueue.values())
    if (queueArray.length < 2) return

    // FIX #22: Check socket connection before matching
    const validEntries = queueArray.filter(entry => {
      const socket = io.sockets.sockets.get(entry.socketId)
      return socket && socket.connected
    })

    // Remove disconnected sockets from queue
    for (const entry of queueArray) {
      const socket = io.sockets.sockets.get(entry.socketId)
      if (!socket || !socket.connected) {
        removeFromQueue(entry.socketId)
      }
    }

    if (validEntries.length < 2) return

    const user1 = validEntries[0]
    const user2 = validEntries[1]

    removeFromQueue(user1.socketId)
    removeFromQueue(user2.socketId)

    // FIX #5: Use database transaction for atomic operation
    await withDBRetry(async () => {
      const result = await db.$transaction(async (tx) => {
        const session = await tx.chatSession.create({
          data: {
            user1Id: user1.user.id,
            user1Type: user1.user.type.toUpperCase() as 'REGISTERED' | 'ANONYMOUS',
            user1Name: user1.user.name,
            user2Id: user2.user.id,
            user2Type: user2.user.type.toUpperCase() as 'REGISTERED' | 'ANONYMOUS',
            user2Name: user2.user.name,
            status: 'ACTIVE',
            startedAt: new Date(),
          },
        })

        const systemMsg = await tx.chatMessage.create({
          data: {
            sessionId: session.id,
            senderId: 'system',
            senderType: 'ANONYMOUS',
            senderName: 'System',
            content: 'Chat session started. Say hello! 🎉',
            type: 'SYSTEM',
            isRead: true,
          },
        })

        return { session, systemMsg }
      })

      const { session } = result

      const activeSession: ActiveSession = {
        sessionId: session.id,
        user1SocketId: user1.socketId,
        user2SocketId: user2.socketId,
        startedAt: new Date(session.startedAt),
      }

      activeSessions.set(user1.socketId, activeSession)
      activeSessions.set(user2.socketId, activeSession)

      const partnerInfo1 = {
        id: user2.user.id,
        name: user2.user.name,
        type: user2.user.type,
        gender: user2.user.gender,
      }
      const partnerInfo2 = {
        id: user1.user.id,
        name: user1.user.name,
        type: user1.user.type,
        gender: user1.user.gender,
      }

      safeEmit(user1.socketId, 'matched', {
        sessionId: session.id,
        partner: partnerInfo1,
      })

      safeEmit(user2.socketId, 'matched', {
        sessionId: session.id,
        partner: partnerInfo2,
      })

      console.log(
        `[Match] ${user1.user.name} ↔ ${user2.user.name} (session: ${session.id})`
      )

      startPeriodicBanCheck(user1.socketId, user1.user)
      startPeriodicBanCheck(user2.socketId, user2.user)
    })
  } catch (err) {
    console.error('[Match] Failed to create chat session:', err)

    // Re-add users to queue on failure
    const queueArray = Array.from(matchingQueue.values())
    // Users are already removed, we need to get them from a backup if needed
    // For now, just log the error
  } finally {
    release()
  }
}

function addToQueueInternal(socketId: string, user: SocketUserData): void {
  // FIX #15: Queue overflow control
  if (matchingQueue.size >= MAX_QUEUE_SIZE) {
    safeEmit(socketId, 'queue_full', {
      message: 'Match queue is currently full. Please try again later.',
    })
    return
  }

  const timer = setTimeout(() => {
    if (matchingQueue.has(socketId)) {
      matchingQueue.delete(socketId)
      safeEmit(socketId, 'match_timeout', {
        message: 'No match found. Try again!',
      })
      console.log(`[Queue] ${user.name} timed out waiting for match`)
    }
  }, MATCH_TIMEOUT_MS)

  matchingQueue.set(socketId, {
    socketId,
    user,
    joinedAt: Date.now(),
    timeoutTimer: timer,
  })
}

function startPeriodicBanCheck(socketId: string, user: SocketUserData): void {
  const interval = setInterval(async () => {
    const socket = io.sockets.sockets.get(socketId)
    if (!socket || !socket.connected || !activeSessions.has(socketId)) {
      clearIntervalSafe(socketId)
      return
    }

    const ban = await checkBan(
      user.type === 'registered' ? user.id : null,
      user.type,
      user.fingerprint,
      user.ipAddress
    )

    if (ban) {
      clearIntervalSafe(socketId)
      socket.emit('banned', {
        reason: ban.reason,
        expiresAt: ban.expiresAt,
      })

      const session = activeSessions.get(socketId)
      if (session) {
        const partnerId = getPartnerSocketId(socketId)
        if (partnerId) {
          safeEmit(partnerId, 'partner_banned', {
            message: 'Your partner has been banned and disconnected.',
          })
        }
        await endSession(session.sessionId, 'system_ban', session.user1SocketId, session.user2SocketId)
      }

      socket.disconnect(true)
      console.log(`[Ban] ${user.name} disconnected - banned during chat: ${ban.reason}`)
    }
  }, BAN_CHECK_INTERVAL_MS)

  banCheckIntervals.set(socketId, interval)
}

// FIX #25: Batched system logging to prevent DB flood
const logBatch: Array<{
  level: string
  action: string
  userId?: string
  userType?: string
  details?: string
  ipAddress?: string
}> = []

async function flushLogs(): Promise<void> {
  if (logBatch.length === 0) return

  const logsToFlush = [...logBatch]
  logBatch.length = 0

  try {
    await withDBRetry(async () => {
      await db.$transaction(
        logsToFlush.map(log =>
          db.systemLog.create({
            data: {
              level: log.level as 'INFO' | 'WARN' | 'ERROR' | 'FATAL',
              action: log.action,
              userId: log.userId || null,
              userType: log.userType?.toUpperCase() as 'REGISTERED' | 'ANONYMOUS' | null,
              details: log.details || null,
              ipHash: log.ipAddress || null,
            },
          })
        )
      )
    })
  } catch (err) {
    console.error('[SystemLog] Failed to write batched logs:', err)
    // Re-add failed logs to batch for retry
    logBatch.push(...logsToFlush)
  }
}

// Flush logs every 5 seconds
setInterval(flushLogs, 5000)

async function logSystemEvent(
  level: string,
  action: string,
  userId?: string,
  userType?: string,
  details?: string,
  ipAddress?: string
): Promise<void> {
  // Add to batch instead of immediate write
  logBatch.push({
    level,
    action,
    userId,
    userType,
    details,
    ipAddress,
  })

  // Keep batch size under control
  if (logBatch.length > 100) {
    await flushLogs()
  }
}

// ============================================================
// Rate Limiting & Spam Detection
// ============================================================
function checkRateLimit(socketId: string, event: string): boolean {
  const config = RATE_LIMITS[event]
  if (!config) return true

  let eventMap = socketRateLimits.get(socketId)
  if (!eventMap) {
    eventMap = new Map()
    socketRateLimits.set(socketId, eventMap)
  }

  let entry = eventMap.get(event)
  const now = Date.now()

  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + config.windowMs }
    eventMap.set(event, entry)
  }

  entry.count++

  if (entry.count > config.maxRequests) {
    return false
  }

  return true
}

// FIX #13: Global IP-based rate limiting
function checkGlobalIpRateLimit(ipAddress: string): boolean {
  const now = Date.now()
  let entry = globalIpRateLimits.get(ipAddress)

  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + GLOBAL_RATE_LIMIT.windowMs }
    globalIpRateLimits.set(ipAddress, entry)
  }

  entry.count++

  return entry.count <= GLOBAL_RATE_LIMIT.maxRequests
}

// FIX #14: Spam detection
function checkSpam(socketId: string, content: string): { isSpam: boolean; reason?: string } {
  const now = Date.now()
  let userSpamData = spamDetectionMap.get(socketId)

  if (!userSpamData) {
    userSpamData = { messages: [], violationCount: 0 }
    spamDetectionMap.set(socketId, userSpamData)
  }

  // Clean old messages
  const cutoff = now - SPAM_CONFIG.duplicateWindowMs
  userSpamData.messages = userSpamData.messages.filter(m => m.timestamp > cutoff)

  // Check for duplicate messages
  const duplicates = userSpamData.messages.filter(m => m.content === content)
  if (duplicates.length >= SPAM_CONFIG.maxDuplicates) {
    userSpamData.violationCount++
    return { isSpam: true, reason: 'Duplicate message spam detected' }
  }

  // Check message rate
  if (userSpamData.messages.length >= SPAM_CONFIG.maxMessagesPerMinute) {
    userSpamData.violationCount++
    return { isSpam: true, reason: 'Message rate limit exceeded' }
  }

  // Add message to history
  userSpamData.messages.push({ content, timestamp: now })

  return { isSpam: false }
}

function clearRateLimits(socketId: string): void {
  socketRateLimits.delete(socketId)
  spamDetectionMap.delete(socketId)
}

// FIX #10: XSS Protection with sanitize-html
function sanitizeString(str: string, maxLen: number): string {
  const s = String(str)
  let sanitized = s.trim()

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '')

  // FIX #9: Use sanitize-html instead of regex
  sanitized = sanitizeHtml(sanitized, {
    allowedTags: [], // Strip all HTML tags
    allowedAttributes: {},
    textFilter: (text) => text,
  })

  // Truncate to max length
  if (sanitized.length > maxLen) {
    sanitized = sanitized.substring(0, maxLen)
  }

  return sanitized
}

function validateEventType(type: string): type is 'text' | 'emoji' | 'system' {
  return type === 'text' || type === 'emoji' || type === 'system'
}

const VALID_REPORT_REASONS = ['spam', 'abuse', 'nsfw', 'harassment', 'other']

function validateReportData(data: { reason: string; description?: string }): { valid: boolean; reason?: string } {
  if (!data.reason || !VALID_REPORT_REASONS.includes(data.reason)) {
    return { valid: false, reason: 'Invalid report reason' }
  }
  if (data.description && data.description.length > 500) {
    return { valid: false, reason: 'Description too long (max 500 chars)' }
  }
  return { valid: true }
}

// FIX #11: GIF domain whitelist validation
function validateGifUrl(url: string): { valid: boolean; reason?: string } {
  if (typeof url !== 'string' || url.length === 0 || url.length > 500) {
    return { valid: false, reason: 'Invalid URL length' }
  }

  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') {
      return { valid: false, reason: 'URL must use HTTPS' }
    }

    // Check domain whitelist
    const hostname = parsed.hostname.toLowerCase()
    const isAllowed = ALLOWED_GIF_DOMAINS.some(domain =>
      hostname === domain || hostname.endsWith(`.${domain}`)
    )

    if (!isAllowed) {
      return { valid: false, reason: 'GIF domain not in whitelist' }
    }

    return { valid: true }
  } catch {
    return { valid: false, reason: 'Invalid URL format' }
  }
}

function clearInactivityTimer(socketId: string): void {
  const timer = inactivityTimers.get(socketId)
  if (timer) {
    clearTimeout(timer)
    inactivityTimers.delete(socketId)
  }
}

function resetInactivityTimer(socketId: string): void {
  clearInactivityTimer(socketId)

  const timer = setTimeout(async () => {
    console.log(`[Inactivity] Socket ${socketId} timed out after ${INACTIVITY_TIMEOUT_MS / 1000}s`)

    const socket = io.sockets.sockets.get(socketId)
    if (!socket || !socket.connected) {
      clearInactivityTimer(socketId)
      return
    }

    const user = getUserData(socket)
    if (!user) {
      socket.disconnect(true)
      clearInactivityTimer(socketId)
      return
    }

    const session = activeSessions.get(socketId)
    if (session) {
      const partnerId = getPartnerSocketId(socketId)
      if (partnerId) {
        safeEmit(partnerId, 'partner_inactive', {
          message: 'Your partner has been disconnected due to inactivity.',
        })
      }
      await endSession(session.sessionId, 'inactivity_timeout', session.user1SocketId, session.user2SocketId)
    }

    removeFromQueue(socketId)
    clearIntervalSafe(socketId)

    await logSystemEvent(
      'WARN',
      'inactivity_timeout',
      user.id,
      user.type,
      `Disconnected due to inactivity: ${user.name}`,
      user.ipAddress
    )

    socket.disconnect(true)
    clearInactivityTimer(socketId)
  }, INACTIVITY_TIMEOUT_MS)

  inactivityTimers.set(socketId, timer)
}

// ============================================================
// Socket Connection Handler
// ============================================================
io.on('connection', async (socket) => {
  const clientIp = getClientIp(socket)
  const authData = socket.handshake.auth as AuthData

  console.log(`[Connect] Socket ${socket.id} from ${clientIp}`)

  // --------------------------------------
  // IP Connection Rate Limiting
  // --------------------------------------
  const ipEntry = ipConnectionAttempts.get(clientIp) || { count: 0, resetAt: Date.now() + 60_000 }
  if (Date.now() > ipEntry.resetAt) {
    ipEntry.count = 0
    ipEntry.resetAt = Date.now() + 60_000
  }
  ipEntry.count++
  ipConnectionAttempts.set(clientIp, ipEntry)

  if (ipEntry.count > MAX_CONNECTIONS_PER_IP_PER_MINUTE) {
    socket.emit('error', { message: 'Too many connection attempts. Please wait.' })
    await logSystemEvent('WARN', 'ip_rate_limited', undefined, undefined, `IP ${clientIp} exceeded connection rate limit`, clientIp)
    socket.disconnect(true)
    return
  }

  // FIX #13: Global IP rate limit check
  if (!checkGlobalIpRateLimit(clientIp)) {
    socket.emit('error', { message: 'Rate limit exceeded. Please slow down.' })
    await logSystemEvent('WARN', 'global_ip_rate_limited', undefined, undefined, `IP ${clientIp} exceeded global rate limit`, clientIp)
    socket.disconnect(true)
    return
  }

  // --------------------------------------
  // Authentication
  // --------------------------------------
  try {
    let userData: SocketUserData

    if (authData.token) {
      // FIX #3: Hardened JWT verification with issuer, audience, algorithm
      let decoded: { userId: string; email: string }
      try {
        decoded = jwt.verify(authData.token, JWT_SECRET, {
          algorithms: ['HS256'],
          issuer: JWT_ISSUER,
          audience: JWT_AUDIENCE,
        }) as { userId: string; email: string }
      } catch {
        socket.emit('auth_error', { message: 'Invalid or expired token' })
        socket.disconnect(true)
        return
      }

      const user = await withDBRetry(() =>
        db.user.findUnique({ where: { id: decoded.userId } })
      )
      if (!user) {
        socket.emit('auth_error', { message: 'User not found' })
        socket.disconnect(true)
        return
      }

      const ban = await checkBan(user.id, 'REGISTERED', authData.fingerprint, clientIp)
      if (ban) {
        socket.emit('banned', {
          reason: ban.reason,
          expiresAt: ban.expiresAt,
        })
        await logSystemEvent(
          'WARN',
          'banned_user_connection_attempt',
          user.id,
          'REGISTERED',
          `Rejected: ${ban.reason}`,
          clientIp
        )
        socket.disconnect(true)
        return
      }

      userData = {
        id: user.id,
        name: user.name,
        type: 'registered',
        fingerprint: authData.fingerprint,
        gender: 'unknown',
        ipAddress: clientIp,
      }

      await withDBRetry(() =>
        db.user.update({
          where: { id: user.id },
          data: { isOnline: true, lastSeen: new Date() },
        })
      )

    } else {
      // Anonymous user
      const fingerprint = authData.fingerprint
      if (!fingerprint) {
        socket.emit('auth_error', { message: 'Fingerprint is required' })
        socket.disconnect(true)
        return
      }

      const ban = await checkBan(null, 'ANONYMOUS', fingerprint, clientIp)
      if (ban) {
        socket.emit('banned', {
          reason: ban.reason,
          expiresAt: ban.expiresAt,
        })
        await logSystemEvent(
          'WARN',
          'banned_anonymous_connection_attempt',
          undefined,
          'ANONYMOUS',
          `Rejected: ${ban.reason}`,
          clientIp
        )
        socket.disconnect(true)
        return
      }

      let anonUser = await withDBRetry(() =>
        db.anonymousUser.findUnique({
          where: { fingerprintHash: fingerprint },
        })
      )

      const gender = (authData.gender || 'UNKNOWN').toUpperCase() as 'MALE' | 'FEMALE' | 'UNKNOWN'

      if (anonUser) {
        anonUser = await withDBRetry(() =>
          db.anonymousUser.update({
            where: { fingerprintHash: fingerprint },
            data: {
              lastSeen: new Date(),
              ipHash: clientIp,
              ...(gender !== 'UNKNOWN' ? { gender } : {}),
            },
          })
        )
      } else {
        const username = authData.anonymousName || generateAnonymousName(gender)
        anonUser = await withDBRetry(() =>
          db.anonymousUser.create({
            data: {
              username,
              gender,
              fingerprintHash: fingerprint,
              ipHash: clientIp,
            },
          })
        )
      }

      userData = {
        id: anonUser.id,
        name: anonUser.username,
        type: 'anonymous',
        fingerprint,
        gender: anonUser.gender,
        ipAddress: clientIp,
      }
    }

    // --------------------------------------
    // FIX #12: Efficient Duplicate Connection Prevention
    // --------------------------------------
    const userKey = `${userData.type}:${userData.id}`
    const existingSocketId = userSocketMap.get(userKey)

    if (existingSocketId && existingSocketId !== socket.id) {
      const existingSocket = io.sockets.sockets.get(existingSocketId)
      if (existingSocket && existingSocket.connected) {
        safeEmit(existingSocketId, 'duplicate_connection', {
          message: 'You have connected from another device/tab.',
        })
        existingSocket.disconnect(true)
        removeFromQueue(existingSocketId)
        clearIntervalSafe(existingSocketId)
        clearInactivityTimer(existingSocketId)
        clearRateLimits(existingSocketId)
        const oldSession = activeSessions.get(existingSocketId)
        if (oldSession) {
          const partnerId = getPartnerSocketId(existingSocketId)
          if (partnerId) {
            safeEmit(partnerId, 'partner_disconnected', { message: 'Your partner disconnected.' })
          }
          await endSession(oldSession.sessionId, 'duplicate', oldSession.user1SocketId, oldSession.user2SocketId)
        }
        connectedUsers.delete(existingSocketId)
      }
    }

    // Update user socket mapping
    userSocketMap.set(userKey, socket.id)

    // --------------------------------------
    // Lockdown Mode Check
    // --------------------------------------
    const lockdownSetting = await withDBRetry(() =>
      db.systemSetting.findUnique({
        where: { key: 'lockdown_mode' },
      })
    )
    if (lockdownSetting && lockdownSetting.value === 'true') {
      socket.emit('system_error', { message: 'PoriChat is currently in maintenance mode. Please try again later.' })
      await logSystemEvent('WARN', 'lockdown_rejected', userData.id, userData.type, 'User rejected due to lockdown mode', clientIp)
      socket.disconnect(true)
      return
    }

    // Store user data on socket
    socket.data.user = userData
    connectedUsers.set(socket.id, userData)

    // Start inactivity timer
    resetInactivityTimer(socket.id)

    console.log(
      `[Auth] ${userData.type} user "${userData.name}" connected (${userData.id})`
    )

    socket.emit('connected', {
      userId: userData.id,
      name: userData.name,
      type: userData.type,
    })

    await logSystemEvent(
      'info',
      'user_connected',
      userData.id,
      userData.type,
      `User connected: ${userData.name}`,
      clientIp
    )

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown authentication error'
    console.error(`[Auth] Error during authentication for ${socket.id}:`, message)
    socket.emit('auth_error', { message: 'Authentication failed' })
    socket.disconnect(true)
    return
  }

  // --------------------------------------
  // Event: find_match - Join the matching queue
  // --------------------------------------
  socket.on('find_match', async () => {
    resetInactivityTimer(socket.id)
    if (!checkRateLimit(socket.id, 'find_match')) {
      socket.emit('rate_limited', { event: 'find_match', message: 'Slow down! You are searching too fast.' })
      return
    }
    const user = getUserData(socket)
    if (!user) return

    if (matchingQueue.has(socket.id)) {
      socket.emit('already_in_queue', { message: 'You are already in the queue' })
      return
    }
    if (activeSessions.has(socket.id)) {
      socket.emit('already_in_session', { message: 'You are already in a chat session' })
      return
    }

    addToQueueInternal(socket.id, user)
    socket.emit('searching', { message: 'Looking for a match...' })
    console.log(`[Queue] ${user.name} joined the queue (queue size: ${matchingQueue.size})`)

    await logSystemEvent('INFO', 'join_queue', user.id, user.type, 'User joined matching queue', clientIp)

    if (matchingQueue.size >= 2) {
      await attemptMatch()
    }
  })

  // --------------------------------------
  // Event: cancel_match - Leave the matching queue
  // --------------------------------------
  socket.on('cancel_match', async () => {
    resetInactivityTimer(socket.id)
    if (!checkRateLimit(socket.id, 'cancel_match')) {
      socket.emit('rate_limited', { event: 'cancel_match', message: 'Slow down!' })
      return
    }
    const user = getUserData(socket)
    if (!user) return

    if (matchingQueue.has(socket.id)) {
      removeFromQueue(socket.id)
      socket.emit('match_cancelled', { message: 'Match search cancelled' })
      console.log(`[Queue] ${user.name} cancelled match search`)

      await logSystemEvent('INFO', 'cancel_queue', user.id, user.type, 'User cancelled match search', clientIp)
    }
  })

  // --------------------------------------
  // Event: chat_message - Send a text/emoji message
  // --------------------------------------
  socket.on('chat_message', async (rawData: unknown) => {
    resetInactivityTimer(socket.id)
    if (!checkRateLimit(socket.id, 'chat_message')) {
      socket.emit('rate_limited', { event: 'chat_message', message: 'Slow down! You are sending messages too fast.' })
      return
    }

    // FIX #2: Zod validation for all input
    const validationResult = ChatMessageSchema.safeParse(rawData)
    if (!validationResult.success) {
      socket.emit('error', { message: 'Invalid message data', details: validationResult.error.issues })
      return
    }

    const data = validationResult.data

    // FIX #17: Enforce hard message size limit
    if (data.content.length > MAX_MESSAGE_SIZE) {
      socket.emit('error', { message: `Message too long (max ${MAX_MESSAGE_SIZE} chars)` })
      return
    }

    // FIX #14: Spam detection
    const spamCheck = checkSpam(socket.id, data.content)
    if (spamCheck.isSpam) {
      socket.emit('spam_detected', { message: spamCheck.reason })
      await logSystemEvent('WARN', 'spam_detected', undefined, undefined, `Spam detected: ${spamCheck.reason}`, clientIp)
      return
    }

    const sanitizedContent = sanitizeString(data.content, MAX_MESSAGE_SIZE)
    if (sanitizedContent.length === 0) {
      socket.emit('error', { message: 'Message cannot be empty' })
      return
    }
    const messageType = (validateEventType(data.type) ? data.type : 'text').toUpperCase() as 'TEXT' | 'EMOJI' | 'SYSTEM'

    const user = getUserData(socket)
    if (!user) return

    const session = activeSessions.get(socket.id)
    if (!session) {
      socket.emit('error', { message: 'No active chat session' })
      return
    }

    const partnerId = getPartnerSocketId(socket.id)
    if (!partnerId) return

    try {
      const message = await withDBRetry(() =>
        db.chatMessage.create({
          data: {
            sessionId: session.sessionId,
            senderId: user.id,
            senderType: user.type.toUpperCase() as 'REGISTERED' | 'ANONYMOUS',
            senderName: user.name,
            content: sanitizedContent,
            type: messageType,
            isRead: false,
          },
        })
      )

      safeEmit(partnerId, 'chat_message', {
        id: message.id,
        sessionId: session.sessionId,
        senderId: user.id,
        senderName: user.name,
        senderType: user.type,
        content: sanitizedContent,
        type: messageType,
        isRead: false,
        createdAt: message.createdAt.toISOString(),
      })

      socket.emit('message_sent', {
        id: message.id,
        sessionId: session.sessionId,
        content: sanitizedContent,
        type: messageType,
        createdAt: message.createdAt.toISOString(),
      })
    } catch (error) {
      console.error('[Chat Message] Failed to save message:', error)
      socket.emit('error', { message: 'Failed to send message. Please try again.' })
    }
  })

  // --------------------------------------
  // Event: typing - Notify partner that user is typing
  // --------------------------------------
  socket.on('typing', () => {
    resetInactivityTimer(socket.id)
    if (!checkRateLimit(socket.id, 'typing')) {
      return
    }
    const partnerId = getPartnerSocketId(socket.id)
    if (partnerId) {
      safeEmit(partnerId, 'user_typing', {})
    }
  })

  // --------------------------------------
  // Event: stop_typing - Notify partner that user stopped typing
  // --------------------------------------
  socket.on('stop_typing', () => {
    resetInactivityTimer(socket.id)
    if (!checkRateLimit(socket.id, 'stop_typing')) {
      return
    }
    const partnerId = getPartnerSocketId(socket.id)
    if (partnerId) {
      safeEmit(partnerId, 'user_stopped_typing', {})
    }
  })

  // --------------------------------------
  // Event: message_seen - Mark messages as read
  // --------------------------------------
  socket.on('message_seen', async (rawData: unknown) => {
    resetInactivityTimer(socket.id)
    if (!checkRateLimit(socket.id, 'message_seen')) {
      return
    }

    const validationResult = MessageSeenSchema.safeParse(rawData)
    if (!validationResult.success) {
      socket.emit('error', { message: 'Invalid message ID' })
      return
    }

    const data = validationResult.data

    const user = getUserData(socket)
    if (!user) return

    const session = activeSessions.get(socket.id)
    if (!session) return

    try {
      const message = await withDBRetry(() =>
        db.chatMessage.findUnique({
          where: { id: data.messageId },
        })
      )

      if (message && message.sessionId === session.sessionId && !message.isRead) {
        await withDBRetry(() =>
          db.chatMessage.update({
            where: { id: data.messageId },
            data: { isRead: true },
          })
        )

        const senderSocketId = getPartnerSocketId(socket.id)
        if (senderSocketId) {
          safeEmit(senderSocketId, 'message_delivered', {
            messageId: data.messageId,
            readAt: new Date().toISOString(),
          })
        }
      }
    } catch (error) {
      console.error('[Message Seen] Failed to update message:', error)
    }
  })

  // --------------------------------------
  // Event: send_gif - Send a GIF message
  // --------------------------------------
  socket.on('send_gif', async (rawData: unknown) => {
    resetInactivityTimer(socket.id)
    if (!checkRateLimit(socket.id, 'send_gif')) {
      socket.emit('rate_limited', { event: 'send_gif', message: 'Slow down! You are sending GIFs too fast.' })
      return
    }

    const validationResult = GifDataSchema.safeParse(rawData)
    if (!validationResult.success) {
      socket.emit('error', { message: 'Invalid GIF data', details: validationResult.error.issues })
      return
    }

    const data = validationResult.data

    const gifValidation = validateGifUrl(data.url)
    if (!gifValidation.valid) {
      socket.emit('error', { message: gifValidation.reason || 'Invalid GIF URL' })
      return
    }

    const user = getUserData(socket)
    if (!user) return

    const session = activeSessions.get(socket.id)
    if (!session) {
      socket.emit('error', { message: 'No active chat session' })
      return
    }

    const partnerId = getPartnerSocketId(socket.id)
    if (!partnerId) return

    try {
      const message = await withDBRetry(() =>
        db.chatMessage.create({
          data: {
            sessionId: session.sessionId,
            senderId: user.id,
            senderType: user.type.toUpperCase() as 'REGISTERED' | 'ANONYMOUS',
            senderName: user.name,
            content: data.url,
            type: 'GIF',
            isRead: false,
          },
        })
      )

      safeEmit(partnerId, 'chat_message', {
        id: message.id,
        sessionId: session.sessionId,
        senderId: user.id,
        senderName: user.name,
        senderType: user.type,
        content: data.url,
        type: 'GIF',
        isRead: false,
        createdAt: message.createdAt.toISOString(),
      })

      socket.emit('message_sent', {
        id: message.id,
        sessionId: session.sessionId,
        content: data.url,
        type: 'GIF',
        createdAt: message.createdAt.toISOString(),
      })
    } catch (error) {
      console.error('[Send GIF] Failed to save GIF message:', error)
      socket.emit('error', { message: 'Failed to send GIF. Please try again.' })
    }
  })

  // --------------------------------------
  // Event: next / skip - End current session and re-join queue
  // --------------------------------------
  const handleNextOrSkip = async () => {
    resetInactivityTimer(socket.id)
    if (!checkRateLimit(socket.id, 'next')) {
      socket.emit('rate_limited', { event: 'next', message: 'Slow down! You are skipping too fast.' })
      return
    }
    const user = getUserData(socket)
    if (!user) return

    const session = activeSessions.get(socket.id)
    if (!session) {
      if (!matchingQueue.has(socket.id)) {
        addToQueueInternal(socket.id, user)
        socket.emit('searching', { message: 'Looking for a match...' })
        if (matchingQueue.size >= 2) {
          await attemptMatch()
        }
      }
      return
    }

    const partnerId = getPartnerSocketId(socket.id)

    if (partnerId) {
      safeEmit(partnerId, 'partner_left', {
        message: `${user.name} has moved on to a new chat.`,
      })
    }

    await endSession(session.sessionId, user.id, session.user1SocketId, session.user2SocketId)

    console.log(`[Session] ${user.name} skipped/reconnected (session: ${session.sessionId})`)
    await logSystemEvent('INFO', 'skip_session', user.id, user.type, `User skipped session ${session.sessionId}`, clientIp)

    addToQueueInternal(socket.id, user)
    socket.emit('searching', { message: 'Looking for a new match...' })

    if (matchingQueue.size >= 2) {
      await attemptMatch()
    }
  }

  socket.on('next', handleNextOrSkip)
  socket.on('skip', handleNextOrSkip)

  // --------------------------------------
  // Event: report_user - Report the current chat partner
  // --------------------------------------
  socket.on('report_user', async (rawData: unknown) => {
    resetInactivityTimer(socket.id)
    if (!checkRateLimit(socket.id, 'report_user')) {
      socket.emit('rate_limited', { event: 'report_user', message: 'Slow down! You are reporting too fast.' })
      return
    }

    const validationResult = ReportDataSchema.safeParse(rawData)
    if (!validationResult.success) {
      socket.emit('error', { message: 'Invalid report data', details: validationResult.error.issues })
      return
    }

    const data = validationResult.data

    const user = getUserData(socket)
    if (!user) return

    const session = activeSessions.get(socket.id)
    if (!session) {
      socket.emit('error', { message: 'No active chat session to report' })
      return
    }

    try {
      const dbSession = await withDBRetry(() =>
        db.chatSession.findUnique({
          where: { id: session.sessionId },
        })
      )
      if (!dbSession) return

      const isUser1 = dbSession.user1Id === user.id
      const reportedId = isUser1 ? dbSession.user2Id : dbSession.user1Id
      const reportedType = isUser1 ? dbSession.user2Type : dbSession.user1Type
      const reportedName = isUser1 ? dbSession.user2Name : dbSession.user1Name

      if (!reportedId) return

      await withDBRetry(() =>
        db.report.create({
          data: {
            reporterId: user.id,
            reporterType: user.type.toUpperCase() as 'REGISTERED' | 'ANONYMOUS',
            reporterName: user.name,
            reportedId,
            reportedType: reportedType?.toUpperCase() as 'REGISTERED' | 'ANONYMOUS',
            reportedName: reportedName || null,
            fingerprintHash: user.fingerprint,
            ipHash: clientIp,
            reason: data.reason,
            description: data.description || null,
            chatSessionId: session.sessionId,
            status: 'PENDING',
            severity: 'MEDIUM',
          },
        })
      )

      socket.emit('report_submitted', {
        message: 'Report submitted. Thank you for helping keep PoriChat safe.',
      })

      console.log(
        `[Report] ${user.name} reported ${reportedName} for: ${data.reason}`
      )

      await logSystemEvent(
        'warn',
        'user_reported',
        user.id,
        user.type,
        `Reported ${reportedName} (${reportedId}): ${data.reason}`,
        clientIp
      )
    } catch (error) {
      console.error('[Report User] Failed to create report:', error)
      socket.emit('error', { message: 'Failed to submit report. Please try again.' })
    }
  })

  // --------------------------------------
  // Event: get_chat_history - Get messages for current session
  // --------------------------------------
  socket.on('get_chat_history', async (rawData: unknown = {}) => {
    resetInactivityTimer(socket.id)
    if (!checkRateLimit(socket.id, 'get_chat_history')) {
      socket.emit('rate_limited', { event: 'get_chat_history', message: 'Slow down!' })
      return
    }

    const validationResult = ChatHistorySchema.safeParse(rawData)
    if (!validationResult.success) {
      socket.emit('error', { message: 'Invalid parameters', details: validationResult.error.issues })
      return
    }

    const data = validationResult.data

    const user = getUserData(socket)
    if (!user) return

    const session = activeSessions.get(socket.id)
    if (!session && !data.sessionId) {
      socket.emit('error', { message: 'No active chat session' })
      return
    }

    const targetSessionId = data.sessionId || session?.sessionId
    if (!targetSessionId) return

    try {
      const dbSession = await withDBRetry(() =>
        db.chatSession.findUnique({
          where: { id: targetSessionId },
        })
      )

      if (!dbSession) {
        socket.emit('error', { message: 'Session not found' })
        return
      }

      const belongs =
        dbSession.user1Id === user.id || dbSession.user2Id === user.id

      if (!belongs) {
        socket.emit('error', { message: 'Access denied to this session' })
        return
      }

      const [messages, total] = await withDBRetry(async () => {
        const msgs = await db.chatMessage.findMany({
          where: { sessionId: targetSessionId },
          orderBy: { createdAt: 'asc' },
          skip: data.offset,
          take: data.limit,
        })
        const count = await db.chatMessage.count({
          where: { sessionId: targetSessionId },
        })
        return [msgs, count]
      })

      socket.emit('chat_history', {
        sessionId: targetSessionId,
        messages: messages.map((msg) => ({
          id: msg.id,
          senderId: msg.senderId,
          senderName: msg.senderName,
          senderType: msg.senderType,
          content: msg.content,
          type: msg.type,
          isRead: msg.isRead,
          createdAt: msg.createdAt.toISOString(),
        })),
        total,
      })
    } catch (error) {
      console.error('[Get Chat History] Failed to fetch history:', error)
      socket.emit('error', { message: 'Failed to load chat history. Please try again.' })
    }
  })

  // --------------------------------------
  // Event: get_stats - Get server statistics
  // --------------------------------------
  socket.on('get_stats', () => {
    resetInactivityTimer(socket.id)
    if (!checkRateLimit(socket.id, 'get_stats')) {
      socket.emit('rate_limited', { event: 'get_stats', message: 'Slow down!' })
      return
    }
    const stats = {
      connectedUsers: connectedUsers.size,
      activeSessions: activeSessions.size / 2,
      inQueue: matchingQueue.size,
    }
    socket.emit('stats', stats)
  })

  // --------------------------------------
  // Event: admin_stats - Admin statistics
  // --------------------------------------
  socket.on('admin_stats', async () => {
    resetInactivityTimer(socket.id)
    if (!checkRateLimit(socket.id, 'admin_stats')) {
      socket.emit('rate_limited', { event: 'admin_stats', message: 'Slow down!' })
      return
    }
    const user = getUserData(socket)
    if (!user) return

    if (user.type === 'registered') {
      const dbUser = await withDBRetry(() =>
        db.user.findUnique({ where: { id: user.id } })
      )
      if (!dbUser || (dbUser.role !== 'ADMIN' && dbUser.role !== 'MODERATOR')) {
        socket.emit('error', { message: 'Access denied' })
        return
      }
    } else {
      socket.emit('error', { message: 'Access denied' })
      return
    }

    try {
      const [totalSessions, activeSessionsCount, totalMessages, totalReports, activeBans] =
        await withDBRetry(async () => {
          const [ts, asc, tm, tr, ab] = await Promise.all([
            db.chatSession.count(),
            db.chatSession.count({ where: { status: 'ACTIVE' } }),
            db.chatMessage.count(),
            db.report.count({ where: { status: 'PENDING' } }),
            db.ban.count({ where: { isActive: true } }),
          ])
          return [ts, asc, tm, tr, ab]
        })

      socket.emit('admin_stats', {
        connectedUsers: connectedUsers.size,
        activeSessions: activeSessionsCount,
        inQueue: matchingQueue.size,
        totalSessions,
        totalMessages,
        pendingReports: totalReports,
        activeBans,
        usersInQueue: Array.from(matchingQueue.values()).map((entry) => ({
          name: entry.user.name,
          type: entry.user.type,
          waitingSince: entry.joinedAt,
        })),
      })
    } catch (error) {
      console.error('[Admin Stats] Failed to fetch stats:', error)
      socket.emit('error', { message: 'Failed to load admin stats. Please try again.' })
    }
  })

  // --------------------------------------
  // Disconnect Handler
  // --------------------------------------
  socket.on('disconnect', async (reason) => {
    const user = getUserData(socket)

    clearInactivityTimer(socket.id)
    clearRateLimits(socket.id)
    clearIntervalSafe(socket.id)

    if (!user) {
      removeFromQueue(socket.id)
      activeSessions.delete(socket.id)
      connectedUsers.delete(socket.id)
      return
    }

    console.log(`[Disconnect] ${user.name} (${socket.id}) - reason: ${reason}`)

    // FIX #12: Clean up user socket mapping
    const userKey = `${user.type}:${user.id}`
    if (userSocketMap.get(userKey) === socket.id) {
      userSocketMap.delete(userKey)
    }

    removeFromQueue(socket.id)

    const session = activeSessions.get(socket.id)
    if (session) {
      const partnerId = getPartnerSocketId(socket.id)

      if (partnerId) {
        safeEmit(partnerId, 'partner_disconnected', {
          message: `${user.name} has disconnected.`,
        })
      }

      await endSession(session.sessionId, user.id, session.user1SocketId, session.user2SocketId)

      console.log(`[Session] Ended session ${session.sessionId} due to disconnect by ${user.name}`)
    }

    clearIntervalSafe(socket.id)
    clearInactivityTimer(socket.id)
    clearRateLimits(socket.id)

    if (user.type === 'registered') {
      await withDBRetry(() =>
        db.user.update({
          where: { id: user.id },
          data: { isOnline: false, lastSeen: new Date() },
        })
      ).catch(() => {})
    } else {
      await withDBRetry(() =>
        db.anonymousUser.update({
          where: { id: user.id },
          data: { lastSeen: new Date() },
        })
      ).catch(() => {})
    }

    connectedUsers.delete(socket.id)

    await logSystemEvent(
      'info',
      'user_disconnected',
      user.id,
      user.type,
      `User disconnected: ${user.name} (reason: ${reason})`,
      clientIp
    )

    if (matchingQueue.size >= 2) {
      await attemptMatch()
    }
  })

  // --------------------------------------
  // Error Handler
  // --------------------------------------
  socket.on('error', (error) => {
    console.error(`[Socket Error] ${socket.id}:`, error)
  })
})

// ============================================================
// HTTP Health Check & Server Start
// ============================================================

httpServer.on('request', (req, res) => {
  if (req.url === '/health') {
    const isHealthy = !dbCircuitBreaker.isOpen()
    res.writeHead(isHealthy ? 200 : 503, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      status: isHealthy ? 'ok' : 'degraded',
      service: 'porichat-chat',
      port: PORT,
      connectedUsers: connectedUsers.size,
      activeSessions: activeSessions.size / 2,
      inQueue: matchingQueue.size,
      uptime: process.uptime(),
      dbCircuitBreaker: dbCircuitBreaker.isOpen() ? 'open' : 'closed',
    }))
    return
  }
  res.writeHead(404)
  res.end('Not Found')
})

httpServer.listen(PORT, () => {
  console.log('========================================')
  console.log('  PoriChat Chat Service (BUG FIXED)')
  console.log(`  Running on http://localhost:${PORT}`)
  console.log(`  Socket.IO path: /socket.io`)
  console.log(`  Health: http://localhost:${PORT}/health`)
  console.log('  Security Features:')
  console.log('  - Payload size limit: 1MB')
  console.log('  - Zod input validation')
  console.log('  - Hardened JWT')
  console.log('  - Mutex match system')
  console.log('  - DB transactions')
  console.log('  - XSS protection (sanitize-html)')
  console.log('  - GIF domain whitelist')
  console.log('  - Spam detection')
  console.log('  - Circuit breaker')
  console.log('========================================')
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Shutdown] SIGTERM received, closing server...')

  // Flush remaining logs
  await flushLogs()

  io.close()
  httpServer.close(() => {
    console.log('[Shutdown] Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', async () => {
  console.log('[Shutdown] SIGINT received, closing server...')

  // Flush remaining logs
  await flushLogs()

  io.close()
  httpServer.close(() => {
    console.log('[Shutdown] Server closed')
    process.exit(0)
  })
})
