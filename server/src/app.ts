import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import { config } from './config.js'
import { ok } from './lib/api-response.js'
import { optionalAuth } from './middleware/auth.js'
import { errorHandler } from './middleware/error.js'
import { appointmentsRouter } from './routes/appointments.js'
import { categoriesRouter } from './routes/categories.js'
import { consumerProfileRouter,consumersRouter } from './routes/consumers.js'
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
  app.use(optionalAuth)

  app.get('/health', (_req, res) => {
    ok(res, { status: 'ok' })
  })

  app.use('/identity', identityRouter)
  app.use('/providers', providersRouter)
  app.use('/provider-profile', providerProfileRouter)
  app.use('/organizations', organizationsRouter)
  app.use('/categories', categoriesRouter)
  app.use('/consumers', consumersRouter)
  app.use('/consumer-profile', consumerProfileRouter)
  app.use('/appointments', appointmentsRouter)

  app.use(errorHandler)

  return app
}
