import { Router } from 'express'
import { isGeminiConfigured } from '../config.js'
import { ASSISTANT_ERROR } from '../lib/assistant-errors.js'
import { streamChat } from '../lib/gemini.js'
import { describeGeminiFailure, type GeminiErrorCopy } from '../lib/gemini-errors.js'
import { toPaymentMethods } from '../lib/payment.js'
import { prisma } from '../lib/prisma.js'
import { createRateLimiter } from '../lib/rateLimit.js'
import { earliestOpenDayKey, parseSpecialDates, toScheduleRule, toServiceAvailability } from '../lib/service-availability.js'
import { openSse, sendSse, sendSseError } from '../lib/sse.js'
import { toTimeZone, wallClockInZone } from '../lib/time-zone.js'
import { asyncHandler, HttpError } from '../middleware/error.js'
import { getProviderBusyIntervals } from '../services/appointments.js'
import { allowsVisitorAssistant, ENTITLEMENT_SELECT, getEntitlements } from '../services/plans.js'
import { isBookingAllowanceSpent, releaseAssistantMessage, spendAssistantMessage } from '../services/planUsage.js'
import { resolveProviderId } from '../services/providerLookup.js'
import {
  buildVisitorSystemPrompt,
  freeWindows,
  parseVisitorTurns,
  VISITOR_FREE_DAYS,
  VISITOR_SPECIAL_DAYS,
} from '../services/visitorAssistant.js'

/**
 * `POST /providers/:id/assistant` — the public page's AI assistant, for any visitor, signed in
 * or not. Read-only: the model gets the page's public facts and nothing to call. The browser
 * keeps the conversation (sessionStorage) and sends it back each turn; nothing of it is stored.
 * Rules: `services/visitorAssistant.ts`. Design record: `docs/routes/ai-assistant.md`.
 */
export const visitorAssistantRouter = Router()

/**
 * Twenty questions an hour per address — a public route that spends a shared Gemini key must
 * brake at our edge first (`server/CLAUDE.md`), as the contact form does for the mail engine.
 * The page's own daily allowance (`visitorAssistantMessagesPerDay`) sits behind it.
 */
const visitorLimiter = createRateLimiter({ limit: 20, windowMs: 60 * 60 * 1000 })

const VISITOR_ERROR_COPY: GeminiErrorCopy = {
  busy: 'The assistant is busy. Please try again shortly.',
  unreadable: { message: 'The assistant could not answer that', code: ASSISTANT_ERROR.assistantUnreadable },
  unavailable: { message: 'The assistant is not available right now', code: ASSISTANT_ERROR.assistantUnavailable },
  timedOut: 'The assistant took too long to answer',
  failed: 'The assistant is unavailable',
}

/** Seconds until the next UTC midnight — when the page's daily questions come back. */
const secondsToUtcMidnight = (now: Date): number =>
  Math.max(60, Math.ceil((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1) - now.getTime()) / 1000))

visitorAssistantRouter.post(
  '/:id/assistant',
  asyncHandler(async (req, res) => {
    const turns = parseVisitorTurns(req.body?.messages)
    if (!turns) throw new HttpError(400, 'Send the conversation, ending with a question of at most 500 characters', 400)

    const verdict = visitorLimiter(`ip:${req.ip ?? 'unknown'}`)
    if (!verdict.allowed) {
      res.setHeader('Retry-After', String(verdict.retryAfterSeconds))
      throw new HttpError(429, 'Too many questions. Please try again later.', 429)
    }

    const providerId = await resolveProviderId(req.params.id ?? '')
    const provider = providerId
      ? await prisma.provider.findUnique({
          where: { id: providerId },
          select: {
            id: true,
            fullName: true,
            description: true,
            address: true,
            phoneCode: true,
            phoneNumber: true,
            phoneVisible: true,
            listed: true,
            available: true,
            requiresBookingApproval: true,
            weekSchedule: true,
            specialDates: true,
            scheduleRule: true,
            timeZone: true,
            paymentInfo: true,
            ratingAvg: true,
            ratingCount: true,
            visitorAssistantEnabled: true,
            user: { select: { email: true } },
            services: {
              where: { active: true },
              orderBy: { name: 'asc' },
              select: { name: true, durationMinutes: true, price: true, currency: true, description: true, availability: true },
            },
            ...ENTITLEMENT_SELECT,
          },
        })
      : null
    const now = new Date()
    const entitlements = provider ? getEntitlements(provider, now) : null
    // One answer for "no such page", "unlisted", "switched off" and "plan lapsed": a visitor is
    // never told about a plan (`server/CLAUDE.md`).
    if (!provider || !entitlements || !provider.listed || !provider.visitorAssistantEnabled || !allowsVisitorAssistant(entitlements)) {
      throw new HttpError(404, 'This page has no assistant', ASSISTANT_ERROR.visitorAssistantOff)
    }
    if (!isGeminiConfigured()) {
      throw new HttpError(503, 'The assistant is not available right now', ASSISTANT_ERROR.assistantUnavailable)
    }
    if (!(await spendAssistantMessage(provider.id, 'visitor', entitlements.visitorAssistantMessagesPerDay, now))) {
      res.setHeader('Retry-After', String(secondsToUtcMidnight(now)))
      throw new HttpError(429, 'The assistant has answered all it can for today', ASSISTANT_ERROR.visitorAssistantBusy)
    }

    try {
      const zone = toTimeZone(provider.timeZone)
      const today = wallClockInZone(now, zone ?? 'UTC').dayKey
      const busy = await getProviderBusyIntervals(provider.id, now, new Date(now.getTime() + (VISITOR_FREE_DAYS + 1) * 86_400_000))
      const parsedSpecial = parseSpecialDates(provider.specialDates, earliestOpenDayKey(now))
      const horizon = new Date(now.getTime() + VISITOR_SPECIAL_DAYS * 86_400_000).toISOString().slice(0, 10)
      const specialDates = ('value' in parsedSpecial ? parsedSpecial.value : []).filter((entry) => entry.from <= horizon)
      const scheduleRule = toScheduleRule(provider.scheduleRule)
      const bookingsFull = provider.available && (await isBookingAllowanceSpent(provider, now))

      const systemInstruction = buildVisitorSystemPrompt({
        name: provider.fullName,
        description: provider.description,
        address: provider.address,
        phone: provider.phoneVisible ? `+${provider.phoneCode} ${provider.phoneNumber.toString()}` : null,
        email: provider.user?.email ?? null,
        timeZone: zone,
        today,
        onlineBooking: !provider.available ? 'paused' : bookingsFull ? 'full' : 'open',
        requiresBookingApproval: provider.requiresBookingApproval,
        paymentMethods: toPaymentMethods(provider.paymentInfo),
        rating: { average: Math.round(provider.ratingAvg * 10) / 10, count: provider.ratingCount },
        weekSchedule: provider.weekSchedule,
        specialDates,
        scheduleRule,
        services: provider.services.map((service) => ({
          name: service.name,
          durationMinutes: service.durationMinutes,
          price: service.price === null ? null : Number(service.price),
          currency: service.currency,
          description: service.description,
          availability: toServiceAvailability(service.availability),
        })),
        freeTime: freeWindows({ weekSchedule: provider.weekSchedule, specialDates, rule: scheduleRule, busy, timeZone: zone, now }),
      })

      const abort = new AbortController()
      res.on('close', () => abort.abort())
      openSse(res)
      for await (const chunk of streamChat({ systemInstruction, turns, signal: abort.signal })) {
        if (chunk.type === 'text') sendSse(res, 'text', { text: chunk.text })
      }
      sendSse(res, 'done', {})
      res.end()
    } catch (error) {
      await releaseAssistantMessage(provider.id, 'visitor', now)
      if (!res.headersSent) throw error
      const failure = describeGeminiFailure(error, VISITOR_ERROR_COPY)
      if (!failure) console.error('[visitor-assistant] reply failed', error)
      const http = failure?.error ?? new HttpError(500, 'The assistant is unavailable', 500)
      sendSseError(res, { status: http.status, code: http.code, message: http.message, retryAfterSeconds: failure?.retryAfterSeconds })
      res.end()
    }
  })
)
