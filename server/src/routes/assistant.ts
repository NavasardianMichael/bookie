import { Prisma } from '@prisma/client'
import { Router } from 'express'
import { isGeminiConfigured } from '../config.js'
import { ok } from '../lib/api-response.js'
import { ASSISTANT_ERROR } from '../lib/assistant-errors.js'
import { streamChat } from '../lib/gemini.js'
import { describeGeminiFailure, type GeminiErrorCopy } from '../lib/gemini-errors.js'
import { mergeProviderNotificationPrefs } from '../lib/notification-prefs.js'
import { PLAN_ERROR } from '../lib/plan-errors.js'
import { prisma } from '../lib/prisma.js'
import { createRateLimiter } from '../lib/rateLimit.js'
import { asTrimmedString } from '../lib/request.js'
import { minutesToTime, toScheduleRule, toServiceAvailability, toSpecialDates } from '../lib/service-availability.js'
import { openSse, sendSse, sendSseError } from '../lib/sse.js'
import { toTimeZone, wallClockInZone, weekdayInZone } from '../lib/time-zone.js'
import { mapAssistantConversation, mapAssistantMessage } from '../mappers/entities.js'
import { requireProvider } from '../middleware/auth.js'
import { asyncHandler, HttpError } from '../middleware/error.js'
import {
  ASSISTANT_CONTEXT_BOOKINGS,
  ASSISTANT_CONVERSATIONS_KEEP,
  ASSISTANT_HISTORY_KEEP,
  ASSISTANT_HISTORY_TURNS,
  ASSISTANT_MESSAGE_MAX,
  type AssistantContext,
  buildProviderSystemPrompt,
  type ChangesProposal,
  conversationTitle,
  historyToTurns,
  parseProposal,
  PROPOSE_CHANGES,
  PROPOSE_CHANGES_FUNCTION,
} from '../services/assistant.js'
import { IMPORT_MAX_ROWS, IMPORT_NOTE_MAX, parseImportResponse } from '../services/bookingImport.js'
import {
  allowsVisitorAssistant,
  assertAssistantMessage,
  ENTITLEMENT_SELECT,
  type Entitlements,
  getEntitlements,
} from '../services/plans.js'
import { countAssistantMessagesToday, releaseAssistantMessage, spendAssistantMessage } from '../services/planUsage.js'

/**
 * The provider's AI assistant — `/provider-profile/assistant`, provider-only, scoped by session.
 * A provider has several chats (`AssistantConversation`); every message belongs to one, and only
 * that chat's turns are replayed to the model.
 * The model only ever *proposes*; the browser applies an approved proposal through the ordinary
 * settings routes and reports back here. Rules: `services/assistant.ts`. Design record:
 * `docs/routes/ai-assistant.md`.
 */
export const assistantRouter = Router()

/**
 * Thirty messages per ten minutes per provider, on every plan — the deployment's brake on one
 * shared Gemini key, beside the plan's daily allowance (`routes/bookingImport.ts` makes the same
 * split). Keyed on the provider.
 */
const messageLimiter = createRateLimiter({ limit: 30, windowMs: 10 * 60 * 1000 })

const ASSISTANT_ERROR_COPY: GeminiErrorCopy = {
  busy: 'The assistant is busy. Please try again shortly.',
  unreadable: { message: 'The assistant could not answer that', code: ASSISTANT_ERROR.assistantUnreadable },
  unavailable: { message: 'The assistant is not available right now', code: ASSISTANT_ERROR.assistantUnavailable },
  timedOut: 'The assistant took too long to answer',
  failed: 'The assistant is unavailable',
}

const PROPOSAL_STATUSES = ['applied', 'partial', 'dismissed'] as const
type ReportedStatus = (typeof PROPOSAL_STATUSES)[number]

/** An outcome report is a short list of per-action results; anything bigger is not one. */
const MAX_OUTCOME_BYTES = 4000

const providerSelect = {
  id: true,
  fullName: true,
  description: true,
  address: true,
  available: true,
  listed: true,
  requiresBookingApproval: true,
  weekSchedule: true,
  specialDates: true,
  scheduleRule: true,
  timeZone: true,
  timeFormat: true,
  emailNotificationPrefs: true,
  seoTitle: true,
  seoDescription: true,
  slug: true,
  visitorAssistantEnabled: true,
  categories: { select: { category: { select: { name: true } } } },
  services: {
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      durationMinutes: true,
      price: true,
      currency: true,
      description: true,
      active: true,
      availability: true,
      _count: { select: { appointments: true } },
    },
  },
  ...ENTITLEMENT_SELECT,
} as const satisfies Prisma.ProviderSelect

type ContextProvider = Prisma.ProviderGetPayload<{ select: typeof providerSelect }>

const loadProvider = async (providerId: string): Promise<ContextProvider> => {
  const provider = await prisma.provider.findUnique({ where: { id: providerId }, select: providerSelect })
  if (!provider) throw new HttpError(404, 'Provider profile not found', 404)
  return provider
}

/**
 * The workspace as the model reads it: everything a settings tab shows, plus pending bookings
 * and the next 30 days' — each with the client's name only (no phone or email), which is what
 * a provider says to point at one ("cancel Anna's on Friday").
 */
const buildContext = async (provider: ContextProvider, entitlements: Entitlements, now: Date): Promise<AssistantContext> => {
  const zone = toTimeZone(provider.timeZone)
  const clock = wallClockInZone(now, zone ?? 'UTC')
  const bookings = await prisma.appointment.findMany({
    where: {
      providerId: provider.id,
      OR: [
        { status: 'pending', startAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
        { status: { in: ['scheduled', 'confirmed'] }, startAt: { gte: now, lt: new Date(now.getTime() + 30 * 86_400_000) } },
      ],
    },
    orderBy: { startAt: 'asc' },
    take: ASSISTANT_CONTEXT_BOOKINGS,
    select: {
      id: true,
      status: true,
      startAt: true,
      durationMinutes: true,
      guestFullName: true,
      consumer: { select: { fullName: true } },
      service: { select: { name: true } },
    },
  })
  const prefs = mergeProviderNotificationPrefs(provider.emailNotificationPrefs)

  return {
    today: clock.dayKey,
    weekday: weekdayInZone(now, zone ?? 'UTC'),
    nowTime: minutesToTime(clock.minutes),
    timeZone: zone,
    timeFormat: provider.timeFormat,
    provider: {
      fullName: provider.fullName,
      description: provider.description,
      address: provider.address,
      available: provider.available,
      listed: provider.listed,
      requiresBookingApproval: provider.requiresBookingApproval,
      scheduleRule: toScheduleRule(provider.scheduleRule),
      weekSchedule: provider.weekSchedule,
      specialDates: toSpecialDates(provider.specialDates),
      notifications: prefs,
      seo: { title: provider.seoTitle, description: provider.seoDescription, slug: provider.slug },
      categories: provider.categories.map((entry) => entry.category.name),
      visitorAssistantEnabled: provider.visitorAssistantEnabled,
    },
    plan: {
      maxActiveServices: entitlements.maxActiveServices,
      customSlug: entitlements.customSlug,
      visitorAssistant: allowsVisitorAssistant(entitlements),
    },
    services: provider.services.map((service) => ({
      id: service.id,
      name: service.name,
      durationMinutes: service.durationMinutes,
      price: service.price === null ? null : Number(service.price),
      currency: service.currency,
      description: service.description,
      active: service.active,
      availability: toServiceAvailability(service.availability),
      hasBookings: service._count.appointments > 0,
    })),
    bookings: [...bookings]
      .sort((a, b) => Number(b.status === 'pending') - Number(a.status === 'pending'))
      .map((booking) => {
        const start = wallClockInZone(booking.startAt, zone ?? 'UTC')
        return {
          id: booking.id,
          status: booking.status,
          start: `${start.dayKey} ${minutesToTime(start.minutes)}`,
          durationMinutes: booking.durationMinutes,
          service: booking.service.name,
          client: booking.consumer?.fullName ?? booking.guestFullName ?? '',
        }
      }),
  }
}

/** Drops everything in one chat past its newest `ASSISTANT_HISTORY_KEEP` messages. */
const pruneHistory = async (conversationId: string): Promise<void> => {
  const stale = await prisma.assistantMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'desc' },
    skip: ASSISTANT_HISTORY_KEEP,
    select: { id: true },
  })
  if (stale.length) await prisma.assistantMessage.deleteMany({ where: { id: { in: stale.map((row) => row.id) } } })
}

/** Drops the provider's chats past the newest `ASSISTANT_CONVERSATIONS_KEEP` by last activity. */
const pruneConversations = async (providerId: string): Promise<void> => {
  const stale = await prisma.assistantConversation.findMany({
    where: { providerId },
    orderBy: { updatedAt: 'desc' },
    skip: ASSISTANT_CONVERSATIONS_KEEP,
    select: { id: true },
  })
  if (stale.length) await prisma.assistantConversation.deleteMany({ where: { id: { in: stale.map((row) => row.id) } } })
}

/** The provider's own chat by id — a `404` for anyone else's, so an id never confirms another's chat. */
const findConversation = async (providerId: string, id: unknown) => {
  const conversation =
    typeof id === 'string' && id ? await prisma.assistantConversation.findFirst({ where: { id, providerId } }) : null
  if (!conversation) throw new HttpError(404, 'Chat not found', 404)
  return conversation
}

/** The chat a request names, or `null` to start a new one. Checked before anything is spent. */
const requestedConversation = (providerId: string, id: unknown) =>
  id === undefined || id === null ? Promise.resolve(null) : findConversation(providerId, id)

/** A message was stored in the chat: it moves to the top of the list. */
const touchConversation = (id: string) =>
  prisma.assistantConversation.update({ where: { id }, data: { updatedAt: new Date() } })

const usageOf = async (providerId: string, entitlements: Entitlements, now: Date) => ({
  used: await countAssistantMessagesToday(providerId, 'provider', now),
  limit: entitlements.assistantMessagesPerDay,
})

/** Refuses a provider whose plan has no assistant — every route but the read. */
const assertIncluded = (entitlements: Entitlements): void => {
  if (entitlements.assistantMessagesPerDay === 0) assertAssistantMessage(0, entitlements)
}

/**
 * `GET /` — the assistant as it reopens: whether it is configured and on this plan, today's
 * usage, the provider's chats (newest activity first — the messages of one come from
 * `GET /conversations/:id`), and the visitor assistant's switch. Answers on every plan, so a
 * locked panel can say what unlocks it.
 */
assistantRouter.get(
  '/',
  requireProvider,
  asyncHandler(async (req, res) => {
    const providerId = req.session!.profileId
    const now = new Date()
    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      select: { visitorAssistantEnabled: true, ...ENTITLEMENT_SELECT },
    })
    if (!provider) throw new HttpError(404, 'Provider profile not found', 404)
    const entitlements = getEntitlements(provider, now)
    const included = entitlements.assistantMessagesPerDay !== 0
    const conversations = included
      ? await prisma.assistantConversation.findMany({
          where: { providerId },
          orderBy: { updatedAt: 'desc' },
          take: ASSISTANT_CONVERSATIONS_KEEP,
        })
      : []

    return ok(res, {
      available: isGeminiConfigured(),
      included,
      usage: await usageOf(providerId, entitlements, now),
      conversations: conversations.map(mapAssistantConversation),
      visitor: { allowed: allowsVisitorAssistant(entitlements), enabled: provider.visitorAssistantEnabled },
    })
  })
)

/**
 * `GET /conversations/:id` — one chat and its messages, oldest first. `404` for a chat that is
 * not this provider's.
 */
assistantRouter.get(
  '/conversations/:id',
  requireProvider,
  asyncHandler(async (req, res) => {
    const conversation = await findConversation(req.session!.profileId, req.params.id)
    const messages = await prisma.assistantMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      take: ASSISTANT_HISTORY_KEEP,
    })
    return ok(res, { conversation: mapAssistantConversation(conversation), messages: messages.map(mapAssistantMessage) })
  })
)

/**
 * `POST /messages` — JSON `{ text, conversationId? }`, at most `ASSISTANT_MESSAGE_MAX`
 * characters. Without `conversationId` it starts a new chat, titled from `text`. Answers as
 * server-sent events (`lib/sse.ts`): `start` (the stored message and its chat), `text` deltas,
 * then `done` (the stored reply, a proposal on it when the model made one, today's usage and the
 * chat) or `error`. Only that chat's turns are replayed to the model.
 *
 * One message of today's allowance is spent before the call and given back when no answer came;
 * the provider's message is dropped with it — and a chat this message started, with it — so a
 * retry does not leave it in the history twice.
 */
assistantRouter.post(
  '/messages',
  requireProvider,
  asyncHandler(async (req, res) => {
    const providerId = req.session!.profileId
    const text = asTrimmedString(req.body?.text)
    if (!text) throw new HttpError(400, 'Write a message first', 400)
    if (text.length > ASSISTANT_MESSAGE_MAX) {
      throw new HttpError(400, `A message is at most ${ASSISTANT_MESSAGE_MAX} characters`, 400)
    }
    if (!isGeminiConfigured()) {
      throw new HttpError(503, 'The assistant is not available right now', ASSISTANT_ERROR.assistantUnavailable)
    }

    const now = new Date()
    const provider = await loadProvider(providerId)
    const entitlements = getEntitlements(provider, now)
    assertIncluded(entitlements)
    const existing = await requestedConversation(providerId, req.body?.conversationId)

    const verdict = messageLimiter(`provider:${providerId}`)
    if (!verdict.allowed) {
      res.setHeader('Retry-After', String(verdict.retryAfterSeconds))
      throw new HttpError(429, 'Too many messages. Please slow down a little.', 429)
    }

    if (!(await spendAssistantMessage(providerId, 'provider', entitlements.assistantMessagesPerDay, now))) {
      assertAssistantMessage(entitlements.assistantMessagesPerDay ?? 0, entitlements)
    }

    let userMessageId: string | null = null
    let startedConversationId: string | null = null
    try {
      const [context, history] = await Promise.all([
        buildContext(provider, entitlements, now),
        existing
          ? prisma.assistantMessage.findMany({
              where: { conversationId: existing.id },
              orderBy: { createdAt: 'desc' },
              take: ASSISTANT_HISTORY_TURNS,
            })
          : Promise.resolve([]),
      ])
      const conversation =
        existing ?? (await prisma.assistantConversation.create({ data: { providerId, title: conversationTitle(text) } }))
      if (!existing) startedConversationId = conversation.id
      const userMessage = await prisma.assistantMessage.create({
        data: { providerId, conversationId: conversation.id, role: 'user', text },
      })
      userMessageId = userMessage.id

      const abort = new AbortController()
      res.on('close', () => abort.abort())

      openSse(res)
      sendSse(res, 'start', {
        message: mapAssistantMessage(userMessage),
        conversation: mapAssistantConversation(conversation),
      })

      let answer = ''
      let proposal: ChangesProposal | null = null
      let dropped = 0
      for await (const chunk of streamChat({
        systemInstruction: buildProviderSystemPrompt(context),
        turns: [...historyToTurns([...history].reverse()), { role: 'user', text }],
        functions: [PROPOSE_CHANGES_FUNCTION],
        signal: abort.signal,
      })) {
        if (chunk.type === 'text') {
          answer += chunk.text
          sendSse(res, 'text', { text: chunk.text })
        } else if (chunk.name === PROPOSE_CHANGES && !proposal) {
          const parsed = parseProposal(chunk.args, context)
          if (parsed) ({ proposal, dropped } = parsed)
        }
      }

      const reply = await prisma.assistantMessage.create({
        data: {
          providerId,
          conversationId: conversation.id,
          role: 'model',
          // A bare call still reads as a turn: its summary is what the provider is shown.
          text: answer.trim() || proposal?.summary || '',
          ...(proposal ? { proposal: proposal as unknown as Prisma.InputJsonValue, proposalStatus: 'pending' } : {}),
        },
      })
      const touched = await touchConversation(conversation.id)
      await pruneHistory(conversation.id)
      if (startedConversationId) await pruneConversations(providerId)
      sendSse(res, 'done', {
        message: mapAssistantMessage(reply),
        dropped,
        usage: await usageOf(providerId, entitlements, now),
        conversation: mapAssistantConversation(touched),
      })
      res.end()
    } catch (error) {
      await releaseAssistantMessage(providerId, 'provider', now)
      if (userMessageId) await prisma.assistantMessage.deleteMany({ where: { id: userMessageId } })
      // A chat this message started has nothing left in it; it goes too (its messages cascade).
      if (startedConversationId) await prisma.assistantConversation.deleteMany({ where: { id: startedConversationId } })
      if (!res.headersSent) throw error
      const failure = describeGeminiFailure(error, ASSISTANT_ERROR_COPY)
      if (!failure) console.error('[assistant] reply failed', error)
      const http = failure?.error ?? new HttpError(500, 'The assistant is unavailable', 500)
      sendSseError(res, {
        status: http.status,
        code: http.code,
        message: http.message,
        retryAfterSeconds: failure?.retryAfterSeconds,
      })
      res.end()
    }
  })
)

/**
 * `POST /photo` — JSON `{ note?, drafts, conversationId? }`: the bookings the photo-import read
 * (`POST /provider-profile/bookings/import/parse`, which spent the photo allowance) put into a
 * chat as a turn to review — a new one, titled from the note, without `conversationId`.
 * Re-narrowed here, so the chat stores only what that read could have returned. No model call
 * and no assistant message spent. `201 { messages, conversation }`.
 */
assistantRouter.post(
  '/photo',
  requireProvider,
  asyncHandler(async (req, res) => {
    const providerId = req.session!.profileId
    const now = new Date()
    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      select: { ...ENTITLEMENT_SELECT, services: { where: { active: true }, select: { id: true } } },
    })
    if (!provider) throw new HttpError(404, 'Provider profile not found', 404)
    assertIncluded(getEntitlements(provider, now))

    const note = asTrimmedString(req.body?.note)
    if (note && note.length > IMPORT_NOTE_MAX) throw new HttpError(400, `note must be ${IMPORT_NOTE_MAX} characters or fewer`, 400)
    if (!Array.isArray(req.body?.drafts) || req.body.drafts.length > IMPORT_MAX_ROWS) {
      throw new HttpError(400, `drafts must be a list of at most ${IMPORT_MAX_ROWS}`, 400)
    }
    const drafts = parseImportResponse(
      JSON.stringify({ bookings: req.body.drafts }),
      new Set(provider.services.map((service) => service.id))
    )

    const existing = await requestedConversation(providerId, req.body?.conversationId)
    const conversation =
      existing ??
      (await prisma.assistantConversation.create({ data: { providerId, title: conversationTitle(note ?? '') } }))

    const sent = await prisma.assistantMessage.create({
      data: { providerId, conversationId: conversation.id, role: 'user', text: note ?? '', proposal: { kind: 'photo' } },
    })
    const read = await prisma.assistantMessage.create({
      data: {
        providerId,
        conversationId: conversation.id,
        role: 'model',
        text: '',
        proposal: { kind: 'photoImport', drafts } as unknown as Prisma.InputJsonValue,
        ...(drafts.length ? { proposalStatus: 'pending' as const } : {}),
      },
    })
    const touched = await touchConversation(conversation.id)
    await pruneHistory(conversation.id)
    if (!existing) await pruneConversations(providerId)
    return ok(
      res,
      { messages: [mapAssistantMessage(sent), mapAssistantMessage(read)], conversation: mapAssistantConversation(touched) },
      201
    )
  })
)

/**
 * `PATCH /messages/:id` — JSON `{ status: applied | partial | dismissed, outcome? }`: what became
 * of a pending proposal. The browser applied it (or not) through the ordinary routes; this only
 * records it, so the chat reopens on the truth and the model is told on the next turn. A
 * proposal is decided once — a second report is a `409`.
 */
assistantRouter.patch(
  '/messages/:id',
  requireProvider,
  asyncHandler(async (req, res) => {
    const providerId = req.session!.profileId
    const status = req.body?.status as ReportedStatus
    if (!PROPOSAL_STATUSES.includes(status)) {
      throw new HttpError(400, `status must be one of: ${PROPOSAL_STATUSES.join(', ')}`, 400)
    }
    const outcome = req.body?.outcome
    if (outcome !== undefined && JSON.stringify(outcome).length > MAX_OUTCOME_BYTES) {
      throw new HttpError(400, 'outcome is too large', 400)
    }

    const { count } = await prisma.assistantMessage.updateMany({
      where: { id: req.params.id, providerId, proposalStatus: 'pending' },
      data: { proposalStatus: status, ...(outcome === undefined ? {} : { outcome: outcome as Prisma.InputJsonValue }) },
    })
    if (!count) {
      const exists = await prisma.assistantMessage.count({ where: { id: req.params.id, providerId } })
      throw exists
        ? new HttpError(409, 'This proposal has already been decided', 409)
        : new HttpError(404, 'Message not found', 404)
    }
    const message = await prisma.assistantMessage.findUniqueOrThrow({ where: { id: req.params.id } })
    return ok(res, mapAssistantMessage(message))
  })
)

/**
 * `DELETE /conversations/:id` — deletes one chat and its messages. Today's usage is kept
 * (`AssistantUsage`), and changes already applied from it stay as they are.
 */
assistantRouter.delete(
  '/conversations/:id',
  requireProvider,
  asyncHandler(async (req, res) => {
    const conversation = await findConversation(req.session!.profileId, req.params.id)
    await prisma.assistantConversation.delete({ where: { id: conversation.id } })
    return ok(res, { deleted: true })
  })
)

/**
 * `PUT /visitor` — JSON `{ enabled }`: the public page's assistant. Switching it on needs a plan
 * that allows it (`featureLocked` otherwise); switching it off never does.
 */
assistantRouter.put(
  '/visitor',
  requireProvider,
  asyncHandler(async (req, res) => {
    const providerId = req.session!.profileId
    const enabled = req.body?.enabled
    if (typeof enabled !== 'boolean') throw new HttpError(400, 'enabled must be true or false', 400)
    const provider = await prisma.provider.findUnique({ where: { id: providerId }, select: ENTITLEMENT_SELECT })
    if (!provider) throw new HttpError(404, 'Provider profile not found', 404)
    const entitlements = getEntitlements(provider, new Date())
    if (enabled && !allowsVisitorAssistant(entitlements)) {
      throw new HttpError(403, 'The visitor assistant is included in the Premium plan.', PLAN_ERROR.featureLocked)
    }
    await prisma.provider.update({ where: { id: providerId }, data: { visitorAssistantEnabled: enabled } })
    return ok(res, { allowed: allowsVisitorAssistant(entitlements), enabled })
  })
)
