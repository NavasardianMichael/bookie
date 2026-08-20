import path from 'node:path'
import { fileURLToPath } from 'node:url'

import 'dotenv/config'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const config = {
  port: Number(process.env.PORT ?? 4142),
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:4141',
  uploadDir: path.resolve(process.env.UPLOAD_DIR ?? path.join(__dirname, '../uploads')),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  cookieName: 'bookie_session',
  otpTtlMs: 5 * 60 * 1000,
  devOtpBypass: '123456',
}
