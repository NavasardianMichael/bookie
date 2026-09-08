import { Router } from 'express'
import { config } from '../config.js'
import { fail, ok } from '../lib/api-response.js'
import { escapeHtml, isMailConfigured, sendInternalMail } from '../lib/mail.js'
import { createRateLimiter } from '../lib/rateLimit.js'
import { asBoundedString, asTrimmedString, isEmail } from '../lib/request.js'
import { asyncHandler } from '../middleware/error.js'

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

/** Matches `MAX_CHARS_FOR_INPUT` on the client, which validates the same fields. */
const MAX_NAME_LENGTH = 40
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
 */
const htmlBodyFor = (message: string): string => `<p style="white-space:pre-wrap">${escapeHtml(message)}</p>`

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

    const firstName = asBoundedString(req.body?.firstName, MAX_NAME_LENGTH)
    const lastName = asBoundedString(req.body?.lastName, MAX_NAME_LENGTH)
    const message = asBoundedString(req.body?.message, MAX_MESSAGE_LENGTH)

    if (!firstName) return fail(res, 'First name is required')
    if (!lastName) return fail(res, 'Last name is required')
    if (!message) return fail(res, 'Message is required')

    // Optional, but a malformed address is rejected rather than forwarded — a reply-to
    // that cannot be replied to is worse than none, because it looks answerable.
    const email = asTrimmedString(req.body?.email)?.toLowerCase()
    if (email && !isEmail(email)) return fail(res, 'Valid email required')

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
      console.log(`[contact] ${firstName} ${lastName} <${email ?? 'no email given'}>\n${message}`)
      return ok(res, true)
    }

    const result = await sendInternalMail({
      subject: `Contact form — ${firstName} ${lastName}`,
      body: htmlBodyFor(message),
      senderEmail: email,
      firstName,
      lastName,
      details: { signedIn: Boolean(req.session), role: req.session?.role },
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
