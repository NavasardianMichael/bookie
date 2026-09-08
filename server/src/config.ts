import path from 'node:path'
import { fileURLToPath } from 'node:url'

import './load-env.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const config = {
  port: Number(process.env.PORT ?? 4142),
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:4141',
  uploadDir: path.resolve(process.env.UPLOAD_DIR ?? path.join(__dirname, '../uploads')),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  cookieName: 'bookie_session',
  otpTtlMs: 5 * 60 * 1000,
  /** Email-verification links last a day — unlike SMS OTP they are not typed in immediately. */
  emailVerifyTtlMs: 24 * 60 * 60 * 1000,
  devOtpBypass: '123456',
  /**
   * External mail engine. Read only by `lib/mail.ts` — nothing else may touch `apiKey`.
   *
   * An empty `apiUrl` or `apiKey` disables sending rather than throwing, which is what
   * `.env.example` ships: local dev has no key, so the contact form still stores its
   * message and the verification link still prints to this console.
   */
  mail: {
    apiUrl: (process.env.MAIL_API_URL ?? '').replace(/\/+$/, ''),
    apiKey: process.env.MAIL_API_KEY ?? '',
    /** Identifies this app to the engine; must match the id registered there. */
    appId: process.env.MAIL_APP_ID ?? 'bookie',
  },
}
