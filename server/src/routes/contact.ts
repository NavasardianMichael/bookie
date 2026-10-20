import type { Addon } from '@prisma/client'
import { Router } from 'express'
import { config } from '../config.js'
import { fail, ok } from '../lib/api-response.js'
import { escapeHtml, isMailConfigured, sendInternalMail } from '../lib/mail.js'
import { createRateLimiter } from '../lib/rateLimit.js'
import { asBoundedString, asFullName, asTrimmedString, isEmail } from '../lib/request.js'
import { asyncHandler } from '../middleware/error.js'
import { ADDON_ORDER, maxAddonQuantity, PLAN_ORDER } from '../services/plans.js'

/**
 * The public contact page's only endpoint.
 *
 * Deliberately **unauthenticated** — a visitor who cannot sign in is exactly the person
 * most likely to need it. `optionalAuth` runs globally, so a signed-in sender is still
 * identified without the route requiring it.
 *
 * **Nothing is written to the database, on purpose.** The admin inbox is the system of
 * record: a `ContactMessage` table would duplicate it, hold name/email/free-text PII with
 * no retention policy, and — with no admin surface to read it — never be looked at. So a
 * send that fails is reported to the visitor rather than banked silently, which is why
 * this route surfaces the engine's failure instead of swallowing it.
 */
export const contactRouter = Router()

/** Matches `MAX_CHARS_FOR_CONTACT_MESSAGE` on the client. */
const MAX_MESSAGE_LENGTH = 2000

/**
 * Five an hour per IP. Generous for a person with a real problem, and far below the mail
 * engine's own 10/minute — which it applies per IP *as it sees them*, meaning this whole
 * server shares one bucket with transactional mail. See `lib/rateLimit.ts`.
 */
const limiter = createRateLimiter({ limit: 5, windowMs: 60 * 60 * 1000 })

/**
 * Every interpolated value came from a request body, so it is escaped. The engine's
 * DOMPurify pass strips scripts and handlers, but an `<a href>` or `<img>` a visitor
 * typed would otherwise survive as live markup inside our own template.
 *
 * The address is in the body as well as `senderEmail`. The engine may use that field
 * only as reply metadata; the inbox still has to show where to write back.
 */
const htmlBodyFor = (message: string, email: string): string =>
  `<p><strong>Email</strong><br/>${escapeHtml(email)}</p>` +
  `<p style="white-space:pre-wrap">${escapeHtml(message)}</p>`

/**
 * What a message is about, when the page sending it knows — the Plan tab's and `/pricing`'s
 * requests for a plan or an add-on. **Allowlisted, never a free-text subject**: the subject
 * line is ours, and a visitor-supplied one would let anyone dress a message up as something
 * it is not. Where Paddle does not sell a plan or an add-on (no key or price configured),
 * these requests are how it is sold — an admin grants it on `/admin/providers`
 * (docs/BILLING.md); the subject names it so the inbox can be worked at a glance.
 */
const TOPICS = ['planUpgrade', 'addonRequest'] as const
type Topic = (typeof TOPICS)[number]

const asTopic = (raw: unknown): Topic | undefined => TOPICS.find((topic) => topic === raw)
const asPlan = (raw: unknown) => PLAN_ORDER.find((plan) => plan === raw)
const asAddon = (raw: unknown) => ADDON_ORDER.find((addon) => addon === raw)

/** A pack count from the request, or undefined: a request never fails over its quantity. */
const asQuantity = (raw: unknown, addon: Addon | undefined): number | undefined =>
  addon && typeof raw === 'number' && Number.isInteger(raw) && raw >= 1 && raw <= maxAddonQuantity(addon) ? raw : undefined

const SUBJECT_BY_TOPIC: Record<Topic, (what: string | undefined, name: string) => string> = {
  planUpgrade: (plan, name) => `Plan upgrade request — ${plan ?? 'plan not chosen'} — ${name}`,
  addonRequest: (addon, name) => `Add-on request — ${addon ?? 'add-on not chosen'} — ${name}`,
}

contactRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    /**
     * Honeypot: a hidden field no person can see, so anything in it is a bot.
     *
     * Answered with a plain success and no send — telling a bot it was detected only
     * teaches whoever wrote it to stop filling the field in.
     */
    if (asTrimmedString(req.body?.website)) {
      return ok(res, true)
    }

    const fullName = asFullName(req.body?.fullName)
    const message = asBoundedString(req.body?.message, MAX_MESSAGE_LENGTH)

    if (!fullName) return fail(res, 'Full name is required')
    if (!message) return fail(res, 'Message is required')

    // Required, and a malformed address is rejected rather than forwarded — a reply-to
    // that cannot be replied to is worse than none, because it looks answerable.
    const email = asTrimmedString(req.body?.email)?.toLowerCase()
    if (!email || !isEmail(email)) return fail(res, 'Valid email required')

    // An unknown topic, plan or add-on is dropped, not refused: the message itself still matters.
    const topic = asTopic(req.body?.topic)
    const plan = topic === 'planUpgrade' ? asPlan(req.body?.plan) : undefined
    const addon = topic === 'addonRequest' ? asAddon(req.body?.addon) : undefined
    const quantity = asQuantity(req.body?.quantity, addon)
    const asked = topic === 'addonRequest' ? (addon && quantity && quantity > 1 ? `${addon} ×${quantity}` : addon) : plan

    /**
     * Counted **after** validation, and after the honeypot, so only a submission that is
     * actually about to be mailed spends from the budget.
     *
     * Limiting first looks safer and is worse: the scarce resource is the mail engine's
     * shared quota, which a rejected request never touches, so counting 400s would let
     * someone mistyping their email four times lock themselves out of a support channel
     * for an hour. Junk that fails validation costs nothing external and is answered with
     * a cheap 400 however often it arrives.
     */
    const verdict = limiter(req.ip ?? 'unknown')
    if (!verdict.allowed) {
      res.setHeader('Retry-After', String(verdict.retryAfterSeconds))
      return fail(res, 'Too many messages from this address. Please try again later.', 429, 429)
    }

    /**
     * Dev ships an empty `MAIL_API_KEY`, so mirror what the OTP and verification-link
     * flows already do there: print it and report success. In production an unconfigured
     * engine is a real outage and must not look like a delivered message.
     */
    if (!isMailConfigured()) {
      if (config.nodeEnv === 'production') {
        return fail(res, 'Contact is temporarily unavailable. Please try again later.', 503, 503)
      }
      console.log(`[contact] ${topic ? `${topic} ${asked ?? ''} ` : ''}${fullName} <${email}>\n${message}`)
      return ok(res, true)
    }

    const result = await sendInternalMail({
      subject: topic ? SUBJECT_BY_TOPIC[topic](asked, fullName) : `Contact form — ${fullName}`,
      body: htmlBodyFor(message, email),
      senderEmail: email,
      // The engine's contract still names the pair (`lib/mail.ts`); the whole name rides
      // in `firstName`, and `lastName` stays out rather than duplicating it.
      firstName: fullName,
      details: {
        signedIn: Boolean(req.session),
        role: req.session?.role,
        // The provider id from the session, never the body — it is what the admin plan
        // screen is searched by, and a body field could name somebody else's page.
        ...(topic
          ? {
              topic,
              plan,
              addon,
              quantity,
              providerId: req.session?.role === 'provider' ? req.session.profileId : undefined,
            }
          : {}),
      },
    })

    if (!result.ok) {
      // 429 is passed through so the client can say "try again shortly" rather than
      // "something went wrong"; everything else is an upstream fault, which is a 502.
      const status = result.status === 429 ? 429 : 502
      return fail(res, 'We could not send your message. Please try again in a moment.', status, status)
    }

    return ok(res, true)
  })
)
