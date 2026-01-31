import { z } from 'zod'

export const registerSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).max(200),
})

export const loginSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(1).max(200),
})
