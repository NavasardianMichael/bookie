import type { OAuthFlowContext } from '../lib/oauth-state.js'
import type { SessionPayload } from '../lib/session.js'

declare global {
  namespace Express {
    interface Request {
      session?: SessionPayload
      /**
       * The validated Google OAuth flow context, set by `oauthStateStore.verify` once the
       * `state` nonce has matched. Passport hands the state store the request but gives
       * the route no other channel back, so this is how `role` / `returnPath` / `intent`
       * reach the callback handler.
       */
      oauthFlow?: OAuthFlowContext
    }
  }
}

export {}
