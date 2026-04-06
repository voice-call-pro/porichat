/**
 * Simple in-memory rate limiter for API routes
 * Tracks by IP address or user ID
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) store.delete(key)
  }
}, 300_000)

export interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

export function rateLimit(
  identifier: string,
  config: RateLimitConfig
): { success: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const entry = store.get(identifier)

  if (!entry || now > entry.resetAt) {
    store.set(identifier, { count: 1, resetAt: now + config.windowMs })
    return { success: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs }
  }

  entry.count++
  const remaining = Math.max(0, config.maxRequests - entry.count)

  if (entry.count > config.maxRequests) {
    return { success: false, remaining: 0, resetAt: entry.resetAt }
  }

  return { success: true, remaining, resetAt: entry.resetAt }
}

// Preset configs
export const RATE_LIMITS = {
  auth: { maxRequests: 10, windowMs: 60_000 },         // 10 auth req/min
  chat: { maxRequests: 60, windowMs: 60_000 },          // 60 chat req/min
  admin: { maxRequests: 120, windowMs: 60_000 },        // 120 admin req/min
  report: { maxRequests: 5, windowMs: 60_000 },         // 5 reports/min
  general: { maxRequests: 30, windowMs: 60_000 },       // 30 general req/min
}
