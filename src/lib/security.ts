/**
 * Security utilities for PoriChat
 * Input sanitization, XSS prevention, IP utilities
 */

/**
 * Sanitize a string by removing potential XSS vectors
 * - Strips HTML tags
 * - Removes null bytes
 * - Trims whitespace
 * - Truncates to max length
 */
export function sanitizeString(input: string, maxLength: number = 2000): string {
  if (typeof input !== 'string') return ''
  return input
    .replace(/[\0\x00]/g, '')          // Remove null bytes
    .replace(/<[^>]*>/g, '')            // Strip HTML tags
    .replace(/javascript:/gi, '')       // Remove javascript: protocol
    .replace(/on\w+=/gi, '')            // Remove event handlers (onclick=, etc.)
    .trim()
    .slice(0, maxLength)
}

/**
 * Validate a URL (must be HTTPS)
 */
export function isValidUrl(url: string, maxLength: number = 500): boolean {
  if (typeof url !== 'string') return false
  if (url.length > maxLength) return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Sanitize an email address (lowercase, trim, remove whitespace)
 */
export function sanitizeEmail(email: string): string {
  if (typeof email !== 'string') return ''
  return email.toLowerCase().trim().replace(/\s/g, '')
}

/**
 * Sanitize a username (alphanumeric + underscores + dashes + dots only)
 */
export function sanitizeUsername(name: string): string {
  if (typeof name !== 'string') return ''
  return name.trim().replace(/[^a-zA-Z0-9_\-.]/g, '').slice(0, 50)
}

/**
 * Extract client IP from request headers
 * Checks X-Forwarded-For, X-Real-IP, then falls back to connection remote address
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp
  return 'unknown'
}

/**
 * Check if an IP address is a private/local address
 */
export function isPrivateIp(ip: string): boolean {
  return ip === 'unknown' || ip === '::1' || ip === '127.0.0.1' ||
    ip.startsWith('10.') || ip.startsWith('172.') || ip.startsWith('192.168.')
}

/**
 * Security headers for Next.js responses
 */
export const securityHeaders: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' wss: https:;",
}
