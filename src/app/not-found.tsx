import { getTranslations } from 'next-intl/server'
import { DEFAULT_LOCALE } from '@i18n/config'
import { localePath } from '@i18n/pathname'
import { ROUTES } from '@constants/routes'
import { BRAND, NEUTRAL, RADII } from '@styles/tokens'

/**
 * The 404 for **unmatched URLs**, which never reach `[lang]/not-found.tsx`.
 *
 * A nested `not-found` only catches `notFound()` thrown inside its own segment; an
 * address that matches no route at all resolves against the *root* one. Without this
 * file that was Next's built-in page — an unstyled `404: This page could not be found.`
 * on a bare `<html>`, which is what `/en/anything-wrong` served.
 *
 * **Styles are inline, for the same reason `global-error.tsx`'s are.** This renders above
 * `app/[lang]/layout.tsx` — the app's only root layout — so no stylesheet, font or
 * `ConfigProvider` is loaded around it and not one Tailwind class would resolve. Values
 * come from `tokens.ts` so the page still matches the brand. Next supplies the `<html>`
 * and `<body>` here, so unlike `global-error.tsx` this component must not render its own.
 *
 * **Copy is `DEFAULT_LOCALE`, not the requested locale.** Above the root layout there is
 * no `[lang]` param and `next/root-params` has nothing to read, so the locale genuinely
 * is not knowable here. Reading the catalogue still beats hardcoding English, and the
 * `notFound()` path — every dead provider, category and organization link — keeps its
 * fully translated page.
 */
export default async function RootNotFound() {
  const [t, tCommon] = await Promise.all([
    getTranslations({ locale: DEFAULT_LOCALE, namespace: 'Errors' }),
    getTranslations({ locale: DEFAULT_LOCALE, namespace: 'Common' }),
  ])

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        background: NEUTRAL[0],
        color: BRAND[900],
        fontFamily: 'system-ui, -apple-system, sans-serif',
        textAlign: 'center',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', maxWidth: '32rem' }}>
        <p
          aria-hidden='true'
          style={{ margin: 0, fontSize: '4rem', fontWeight: 800, lineHeight: 1, color: BRAND[300] }}
        >
          404
        </p>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>{t('notFoundTitle')}</h1>
        <p style={{ margin: 0, color: NEUTRAL[600] }}>{t('notFoundBody')}</p>
        <a
          href={localePath(DEFAULT_LOCALE, ROUTES.home)}
          style={{
            marginTop: '0.5rem',
            display: 'inline-flex',
            minHeight: '2.75rem',
            alignItems: 'center',
            padding: '0 1.25rem',
            borderRadius: `${RADII.base}px`,
            background: BRAND[900],
            color: NEUTRAL[0],
            fontSize: '1rem',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          {tCommon('goHome')}
        </a>
      </div>
    </div>
  )
}
