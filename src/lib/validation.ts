import { z } from 'zod';

// ============ AUTH SCHEMAS ============

export const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name must be at most 50 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const changeUsernameSchema = z.object({
  username: z.string().min(2, 'Username must be at least 2 characters').max(20, 'Username must be at most 20 characters'),
  fingerprint: z.string().optional(),
});

// ============ ADMIN SCHEMAS ============

export const userActionSchema = z.object({
  action: z.enum(['ban', 'unban', 'suspend', 'promote', 'demote']),
  reason: z.string().optional(),
  duration: z.number().optional(),
});

export const resolveReportSchema = z.object({
  action: z.enum(['resolve', 'dismiss']),
  note: z.string().optional(),
});

export const banFromReportSchema = z.object({
  type: z.enum(['temporary', 'permanent']),
  duration: z.number().optional(),
  reason: z.string().min(1, 'Reason is required'),
});

export const manualBanSchema = z.object({
  fingerprint: z.string().optional(),
  ipAddress: z.string().optional(),
  reason: z.string().min(1, 'Reason is required'),
  type: z.enum(['temporary', 'permanent']),
  duration: z.number().optional(),
});

export const updateSettingSchema = z.object({
  key: z.string().min(1, 'Key is required'),
  value: z.string().min(1, 'Value is required'),
});

export const emergencySchema = z.object({
  action: z.enum(['lockdown', 'unlock']),
});

// ============ REPORT SCHEMA ============

export const reportSchema = z.object({
  reportedId: z.string().min(1, 'Reported user ID is required'),
  reportedType: z.string().default('anonymous'),
  reportedName: z.string().min(1, 'Reported user name is required'),
  reason: z.string().min(1, 'Reason is required'),
  description: z.string().optional(),
  fingerprint: z.string().optional(),
  ipAddress: z.string().optional(),
  chatSessionId: z.string().optional(),
});

// ============ CHAT / SOCKET SCHEMAS ============

export const chatMessageSchema = z.object({
  content: z.string()
    .min(1, 'Message cannot be empty')
    .max(2000, 'Message too long (max 2000 characters)')
    .transform(val => val.trim()),
  type: z.enum(['text', 'emoji', 'gif']).default('text'),
});

export const reportUserSchema = z.object({
  reason: z.enum(['spam', 'abuse', 'nsfw', 'harassment', 'other']),
  description: z.string().max(500, 'Description too long').optional(),
});

export const gifSchema = z.object({
  url: z.string()
    .url('Invalid URL')
    .max(500, 'URL too long')
    .refine(url => url.startsWith('https://'), 'Only HTTPS URLs allowed'),
});

export const messageSeenSchema = z.object({
  messageId: z.string().min(1, 'Message ID required').max(100),
});

export const chatHistorySchema = z.object({
  sessionId: z.string().optional(),
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).max(10000).optional(),
});

// ============ REFRESH SCHEMA ============

export const refreshSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

// ============ TYPE EXPORTS ============

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangeUsernameInput = z.infer<typeof changeUsernameSchema>;
export type UserActionInput = z.infer<typeof userActionSchema>;
export type ResolveReportInput = z.infer<typeof resolveReportSchema>;
export type BanFromReportInput = z.infer<typeof banFromReportSchema>;
export type ManualBanInput = z.infer<typeof manualBanSchema>;
export type UpdateSettingInput = z.infer<typeof updateSettingSchema>;
export type EmergencyInput = z.infer<typeof emergencySchema>;
export type ReportInput = z.infer<typeof reportSchema>;
