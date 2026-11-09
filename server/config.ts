import { config as loadEnv } from 'dotenv'
import { z } from 'zod'

loadEnv()

const schema = z.object({
  FIREBASE_SERVICE_ACCOUNT_KEY: z.string().optional(),
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET_NAME: z.string().min(1),
  FRONTEND_ORIGIN: z.string().min(1).default('http://localhost:5173'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().max(20 * 1024 * 1024 * 1024).default(2 * 1024 * 1024 * 1024),
})

const parsed = schema.safeParse(process.env)
if (!parsed.success) {
  const fields = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ')
  throw new Error(`StreamX API configuration is incomplete. Set: ${fields}`)
}

export const env = parsed.data
export const r2Endpoint = `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
export const allowedOrigins = env.FRONTEND_ORIGIN
  .split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean)
