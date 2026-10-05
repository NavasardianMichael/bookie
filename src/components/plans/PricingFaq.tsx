import { FC } from 'react'
import { useTranslations } from 'next-intl'
import { PRICING_FAQ } from '@constants/pricing'
import { ROUTES } from '@constants/routes'
import { AppLink } from '@components/ui/bare/AppLink'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { Section } from '@components/ui/layout/Section'
import { Surface } from '@components/ui/layout/Surface'

/**
 * The billing questions a provider asks before paying — cancelling, downgrading, taxes,
 * refunds. Native `<details>` rather than antd `Collapse`, the way `bare/ErrorDetails`
 * collapses: the answers are in the server HTML and open without JavaScript.
 */
export const PricingFaq: FC = () => {
  const t = useTranslations('Pricing')

  return (
    <Section title={t('faqTitle')}>
      <Surface padding='none' className='divide-brand-border divide-y'>
        {PRICING_FAQ.map((key) => (
          <details key={key} className='group px-5 py-4 sm:px-6'>
            <summary className='text-body text-brand-text cursor-pointer select-none font-bold'>
              {t(`faq.${key}.q`)}
            </summary>
            <AppParagraph size='body-sm' className='m-0 mt-2'>
              {t.rich(`faq.${key}.a`, {
                refund: (chunks) => <AppLink href={ROUTES.refundPolicy}>{chunks}</AppLink>,
              })}
            </AppParagraph>
          </details>
        ))}
      </Surface>
    </Section>
  )
}
