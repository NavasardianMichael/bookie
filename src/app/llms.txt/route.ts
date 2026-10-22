import { getProvidersSitemapAPI } from '@api/providers/main'
import { DEFAULT_LOCALE } from '@i18n/config'
import { localePath } from '@i18n/pathname'
import { ROUTE_KEYS, ROUTES } from '@constants/routes'
import { providerPageUrl } from '@helpers/entities'
import { buildLlmsTxt } from '@helpers/llmsTxt'
import { reportError } from '@helpers/reportError'
import { absoluteUrl } from '@helpers/url'

/**
 * `/llms.txt` — the site's index for AI answer engines (`@helpers/llmsTxt`): the main pages,
 * then every listed provider with their categories and services. Read per request, like the
 * sitemap, from the same endpoint.
 *
 * English only: it is one file, and the provider pages it points at serve every language
 * through `?lang=`. `/llms.txt` has a file extension, so `src/proxy.ts` never prefixes it.
 */
export const dynamic = 'force-dynamic'

export async function GET(): Promise<Response> {
  const providers = await getProvidersSitemapAPI().catch((error: unknown) => {
    reportError(error, 'llms.txt:providers')
    return []
  })

  const page = (route: keyof typeof ROUTE_KEYS) => absoluteUrl(localePath(DEFAULT_LOCALE, ROUTES[route]))

  const body = buildLlmsTxt({
    title: 'Bookie',
    summary:
      'Bookie is an appointment booking site: find independent providers and organizations, see their services, prices and opening hours, and book a time online.',
    sections: [
      {
        title: 'Pages',
        links: [
          { name: 'Find providers', url: page(ROUTE_KEYS.providers), note: 'search by name, service, category or place' },
          { name: 'Categories', url: page(ROUTE_KEYS.categories) },
          { name: 'Organizations', url: page(ROUTE_KEYS.organizations) },
          { name: 'Pricing for providers', url: page(ROUTE_KEYS.pricing) },
        ],
      },
      {
        title: 'Providers',
        links: providers.map((provider) => ({
          name: provider.fullName,
          url: providerPageUrl(provider),
          note: [provider.categories.join(', '), provider.services.join(', ')].filter(Boolean).join(' — '),
        })),
      },
    ],
  })

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  })
}
