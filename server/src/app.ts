import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import { config, isGoogleOAuthConfigured } from './config.js'
import { fail, ok } from './lib/api-response.js'
import { optionalAuth } from './middleware/auth.js'
import { requireSameOrigin } from './middleware/csrf.js'
import { errorHandler } from './middleware/error.js'
import { adminRouter } from './routes/admin.js'
import { appointmentsRouter } from './routes/appointments.js'
import { categoriesRouter } from './routes/categories.js'
import { consumerProfileRouter } from './routes/consumers.js'
import { contactRouter } from './routes/contact.js'
import { favoritesRouter } from './routes/favorites.js'
import { identityRouter } from './routes/identity.js'
import { organizationsRouter } from './routes/organizations.js'
import { providerProfileRouter,providersRouter } from './routes/providers.js'
import { providerReviewsRouter, reviewsRouter } from './routes/reviews.js'

export function createApp() {
  const app = express()

  // Exactly one hop — nginx — never `true`, which would trust a client-supplied
  // X-Forwarded-For. Without this every request reports nginx's address and all the
  // in-memory IP limiters in lib/rateLimit.ts collapse into a single shared bucket.
  // Set to the real hop count if another proxy is ever put in front.
  app.set('trust proxy', 1)

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
  // A second router on `/providers`: a review is a sub-resource of the page it is about,
  // so `/providers/:id/reviews` belongs to that namespace even though its handlers live
  // in `routes/reviews.ts`. Express runs both in registration order; the paths do not
  // overlap, because `providersRouter` has no `/:id/reviews`.
  app.use('/providers', providerReviewsRouter)
  app.use('/reviews', reviewsRouter)
  app.use('/admin', adminRouter)
  app.use('/provider-profile', providerProfileRouter)
  app.use('/organizations', organizationsRouter)
  app.use('/categories', categoriesRouter)
  app.use('/contact', contactRouter)
  app.use('/consumer-profile', consumerProfileRouter)
  app.use('/favorites', favoritesRouter)
  app.use('/appointments', appointmentsRouter)

  // No route matched. Answered in the envelope like everything else — Express's default
  // is an HTML page, which the client could only report as "Request failed with status
  // code 404". Also covers a missing file under `/uploads`.
  app.use((_req, res) => fail(res, 'Not found', 404, 404))

  app.use(errorHandler)

  return app
}
