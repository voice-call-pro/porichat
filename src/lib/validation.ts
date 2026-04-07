import { z } from 'zod'
import { BanType, UserType } from '@prisma/client'

// ============ AUTH SCHEMAS ============

export const signupSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  password: z.string().min(6),
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const changeUsernameSchema = z.object({
  username: z.string().min(2).max(20),
  fingerprint: z.string().optional(),
})

// ============ ADMIN SCHEMAS ============

export const userActionSchema = z.object({
  action: z.enum(['ban', 'unban', 'suspend', 'promote', 'demote']),
  reason: z.string().optional(),
  duration: z.number().optional(),
})

export const resolveReportSchema = z.object({
  action: z.enum(['resolve', 'dismiss']),
  note: z.string().optional(),
})

// 🔥 FIXED (Prisma enum use)
export const banFromReportSchema = z.object({
  type: z.nativeEnum(BanType),
  duration: z.number().optional(),
  reason: z.string().min(1),
})

// 🔥 FIXED
export const manualBanSchema = z.object({
  fingerprint: z.string().optional(),
  ipAddress: z.string().optional(),
  reason: z.string().min(1),
  type: z.nativeEnum(BanType),
  duration: z.number().optional(),
})

export const updateSettingSchema = z.object({
  key: z.string().min(1),
  value: z.string().min(1),
})

export const emergencySchema = z.object({
  action: z.enum(['lockdown', 'unlock']),
})

// ============ REPORT SCHEMA ============

export const reportSchema = z.object({
  reportedId: z.string().min(1),

  // 🔥 FIXED
  reportedType: z.nativeEnum(UserType).default(UserType.ANONYMOUS),

  reportedName: z.string().min(1),
  reason: z.string().min(1),
  description: z.string().optional(),
  fingerprint: z.string().optional(),
  ipAddress: z.string().optional(),
  chatSessionId: z.string().optional(),
})

// ============ CHAT / SOCKET SCHEMAS ============

export const chatMessageSchema = z.object({
  content: z.string().min(1).max(2000).transform(v => v.trim()),
  type: z.enum(['text', 'emoji', 'gif']).default('text'),
})

export const reportUserSchema = z.object({
  reason: z.enum(['spam', 'abuse', 'nsfw', 'harassment', 'other']),
  description: z.string().max(500).optional(),
})

export const gifSchema = z.object({
  url: z.string().url().max(500)
    .refine(url => url.startsWith('https://'), 'Only HTTPS URLs allowed'),
})

export const messageSeenSchema = z.object({
  messageId: z.string().min(1).max(100),
})

export const chatHistorySchema = z.object({
  sessionId: z.string().optional(),
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).max(10000).optional(),
})

// ============ REFRESH SCHEMA ============

export const refreshSchema = z.object({
  token: z.string().min(1),
})

// ============ TYPES ============

export type SignupInput = z.infer<typeof signupSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type ChangeUsernameInput = z.infer<typeof changeUsernameSchema>
export type UserActionInput = z.infer<typeof userActionSchema>
export type ResolveReportInput = z.infer<typeof resolveReportSchema>
export type BanFromReportInput = z.infer<typeof banFromReportSchema>
export type ManualBanInput = z.infer<typeof manualBanSchema>
export type UpdateSettingInput = z.infer<typeof updateSettingSchema>
export type EmergencyInput = z.infer<typeof emergencySchema>
export type ReportInput = z.infer<typeof reportSchema>
