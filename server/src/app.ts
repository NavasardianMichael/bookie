import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import { config, isGoogleOAuthConfigured } from './config.js'
import { ok } from './lib/api-response.js'
import { optionalAuth } from './middleware/auth.js'
import { requireSameOrigin } from './middleware/csrf.js'
import { errorHandler } from './middleware/error.js'
import { appointmentsRouter } from './routes/appointments.js'
import { categoriesRouter } from './routes/categories.js'
import { consumerProfileRouter } from './routes/consumers.js'
import { contactRouter } from './routes/contact.js'
import { identityRouter } from './routes/identity.js'
import { organizationsRouter } from './routes/organizations.js'
import { providerProfileRouter,providersRouter } from './routes/providers.js'

export function createApp() {
  const app = express()

  app.use(
    cors({
      origin: config.corsOrigin,
      credentials: true,
    })
  )
  app.use(cookieParser())
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  app.use('/uploads', express.static(config.uploadDir))
  // After the body parsers (so a blocked request is still a well-formed one to log) and
  // before every router, so no state-changing route can be reached without an origin
  // proof. Mounted here rather than per-route precisely so a new router cannot forget it.
  app.use(requireSameOrigin)
  app.use(optionalAuth)

  app.get('/health', (_req, res) => {
    // `google` tells the web app whether to render the Google button. Reported from the
    // server's own config rather than mirrored into a `NEXT_PUBLIC_` variable, so
    // "is Google sign-in available" has exactly one source of truth.
    ok(res, { status: 'ok', google: isGoogleOAuthConfigured() })
  })

  app.use('/identity', identityRouter)
  app.use('/providers', providersRouter)
  app.use('/provider-profile', providerProfileRouter)
  app.use('/organizations', organizationsRouter)
  app.use('/categories', categoriesRouter)
  app.use('/contact', contactRouter)
  app.use('/consumer-profile', consumerProfileRouter)
  app.use('/appointments', appointmentsRouter)

  app.use(errorHandler)

  return app
}
