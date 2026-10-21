# The sign-on funnel — `/auth/*`

Design record for registration, sign-in, Google and becoming a provider. The rules that
apply to every route are in `src/app/CLAUDE.md`; read this before changing a funnel screen.

**Identity is an email and a password, or Google.** There is no phone/OTP step and no
`pendingSignOn` draft — registration is one screen and creates the account outright.

**Registration is role-specific and sign-in is not.** Which form you open decides the role;
there is no account-type toggle inside a form. That holds for Google too: a first-time
Google account is sent to the **same** registration form for its role, or to the
account-type choice when it started from sign-in and has no role yet.

```
/auth/account-type-selection      two links, no form state
   ├─→ /auth/consumer-registration   split screen: name, email, phone, password
   └─→ /auth/provider-registration   card: name, email, phone, password, optional categories
                                     (up to 3) and organization
                    │
                    ▼  POST /identity/register — mails a link, does NOT sign in
        /auth/verify-email          ?token= → confirms AND signs in → newAccountLandingPath(role)
                                    provider → /providers/profile/availability, consumer → /providers

/auth/sign-in                     email + password, or Continue with Google
   ├─ consumer → /
   ├─ provider → /providers/profile
   └─ /auth/forgot-password → (email) → /auth/reset-password?token=

Google:  [any screen] → API /identity/google → Google → API callback
   ├─ known account      → /auth/callback          → getMe() → role decides
   └─ first time         → the registration form for its role, in Google mode (?google=1)
                            (no role yet → /auth/account-type-selection?google=1 → the form)
                            full name + email prefilled, email locked, no password
                            → POST /identity/google/complete — signed in, no emailed link
                            → newAccountLandingPath(role), as above

Consumer-only account:  /consumers/profile (shell banner) → /consumers/profile/become-provider
   name + phone (prefilled from the Consumer row) + optional organization
   → POST /identity/provider-profile — creates the Provider, re-issues the session as provider
   → /providers/profile/availability
```

**A new account lands where its work starts**: a provider on Availability (a page with no
hours cannot be booked), a consumer on Explore. Sign-in keeps its own destinations.

## Five things that are easy to get wrong

1. **Registering does not sign you in.** An unverified account cannot hold a session —
   `middleware/auth.ts` re-checks that on *every* authenticated request — so a form that
   navigates into the app after `register()` is a bug. `/verify-email` issues the session,
   and `VerifyEmailClient` then reads it (`getMe`) and opens `newAccountLandingPath(role)`.
2. **Every anti-enumeration response looks identical.** `register` and `forgot-password`
   answer `{ value: true }` for a taken address, a new one, and a failed send alike. Do not
   branch the UI on them.
3. **`?error=` on `/auth/sign-in` is the Google failure channel.** The API's callback is a
   browser navigation and redirects back with a `GOOGLE_ERROR` code. Copy lives in
   `Auth.googleErrors.*`, and the page reads the param in the **Server Component**.
4. **The Google button is a full-page navigation, never a fetch.** The API sets its cookie
   on its own origin part way through the redirect chain; an XHR would follow it invisibly
   and leave the browser holding no session.
5. **`/auth/layout.tsx` is a pass-through.** The white card is `AuthCard`
   (`@components/ui/layout`), which each step opts into — nested layouts compose rather than
   replace, and the consumer split screen has no card.

## Fields

**Password rules** are mirrored client-side by `usePasswordRules` (`src/hooks/`), which
matches `server/src/lib/password.ts` **rule for rule** — a partial mirror is worse than
none. Choosing a password is always two fields (`NewPasswordFields`); sign-in is the one
single-password screen.

**The phone number validates on submit, not per keystroke** — a number is invalid at every
digit but the last. The field uses `useValidateAfterSubmit` (`src/hooks/`): silent until a
submit checks it, then live on every change and country change. The error names the
country's format from `getPhoneNumberPattern`. The new-organization phone, website and name
work the same way.

**Labels are rendered by `FieldLabel` with an explicit `htmlFor`, not antd's
`Form.Item label`.** Required fields take a trailing `*`; optional ones carry no mark.
antd's label is an `inline-flex` sized to its content, so that mark cannot be laid out
without beating antd's unlayered CSS (a `!` suffix, which is a grep gate). Because the
`Form.Item` then has no `label`, pass `messageVariables={{ label }}` explicitly or
`'Please fill in ${label}'` renders literally.

## Where the registration screens deviate from the mockups

Each of these is a decision, not an oversight — do not "fix" them back:

| Mockup | Built as | Why |
|---|---|---|
| Google sign-up button + "Or register with…" divider | **Built, both** | `GoogleButton` sits above the divider on both registration screens and on sign-in. |
| One free-text phone input | Country `Select` + number, joined by `Space.Compact` | `libphonenumber-js` needs the country to validate. |
| Provider "Business Name" free text | `OrganizationSection` — **Add organization** opens a debounced `?q=` search (5 suggestions, typo-tolerant), **Detach**, and an "Add “…” as a new organization" row that reveals the new organization's fields | Two providers at one business share an `Organization` row. Typed text alone resolves nothing — pick an existing one or explicitly add a new one. A new one is created in the registration transaction (description, address, phone, website; **no email**). On submit a new name is checked (`useSimilarOrganizationCheck` → `GET /organizations/similar`) and `SimilarOrganizationsDialog` offers to join a similar one. Names are trimmed and whitespace-collapsed on both sides. Also used by the settings Profile tab. |
| Provider phone optional | **Required**, as for consumers | Both forms order name → email → phone → password, label "Phone number". |
| Consumer: mobile + **optional** email | Full name added; email **required** | `Consumer.fullName` is non-null; one field, not first/last. Email is the identity and the verification link is the only way in. |
| Provider: 3 fields | Full name added alongside Organization | `Provider.fullName` is non-null. |
| Fixed `h-11` / `h-12` / `h-14` controls | antd's default control height, no `size='large'` | `src/styles/CLAUDE.md` invariant 10. |
| `text-5xl` hero headline | `AppTitle size='h1'` | The `display` step is too large for a half-width panel. |
| Terms / Privacy as `href="#"` | Real `/terms` and `/privacy` routes (`LegalDocument`) | A dead anchor in a consent notice is worse than none. |
| Own header + footer per mockup | Global chrome, except consumer registration hides the header | `Header`/`Footer` mount once in `App.tsx`; per-route chrome is `src/constants/header.ts` (`showLogo`, `showNav`). |
