/**
 * Structured logger for PoriChat
 * Logs to console with levels: info, warn, error, debug
 * Each log includes timestamp, level, context, and message
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogEntry {
  timestamp: string
  level: LogLevel
  context: string
  message: string
  data?: unknown
}

function formatTimestamp(): string {
  return new Date().toISOString()
}

function log(level: LogLevel, context: string, message: string, data?: unknown): void {
  const entry: LogEntry = {
    timestamp: formatTimestamp(),
    level,
    context,
    message,
    ...(data ? { data } : {}),
  }

  const prefix = `[${entry.timestamp}] [${level.toUpperCase()}] [${context}]`

  switch (level) {
    case 'error':
      console.error(prefix, message, data || '')
      break
    case 'warn':
      console.warn(prefix, message, data || '')
      break
    case 'debug':
      if (process.env.NODE_ENV !== 'production') {
        console.debug(prefix, message, data || '')
      }
      break
    default:
      console.log(prefix, message, data || '')
  }
}

export const logger = {
  info: (context: string, message: string, data?: unknown) => log('info', context, message, data),
  warn: (context: string, message: string, data?: unknown) => log('warn', context, message, data),
  error: (context: string, message: string, data?: unknown) => log('error', context, message, data),
  debug: (context: string, message: string, data?: unknown) => log('debug', context, message, data),
}
