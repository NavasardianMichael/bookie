import type { SessionPayload } from '../lib/session.js'

declare global {
  namespace Express {
    interface Request {
      session?: SessionPayload
    }
  }
}

export {}
