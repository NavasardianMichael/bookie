import { FC, ReactNode } from 'react'
import { useFormatter, useTranslations } from 'next-intl'
import { LEGAL_DOCUMENTS, LEGAL_LAST_UPDATED, LegalDocumentKey } from '@constants/legal'
import { ROUTES } from '@constants/routes'
import { AppLink } from '@components/ui/bare/AppLink'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { PageHeader, PageShell } from '@components/ui/layout'

type Props = {
  document: LegalDocumentKey
}

/**
 * One legal document — Terms, Privacy or Refund — rendered from `LEGAL_DOCUMENTS` and its
 * catalogue copy. antd-free and hook-only, so the whole text is in the server HTML: Paddle's
 * reviewers, crawlers and readers without JavaScript all see it.
 *
 * Copy may link with `<contact>`, `<pricing>`, `<refund>`, `<privacy>` and `<terms>`, and
 * emphasise a lead-in with `<b>`.
 */
export const LegalDocument: FC<Props> = ({ document }) => {
  const t = useTranslations('Legal')
  const format = useFormatter()
  const { intro, sections } = LEGAL_DOCUMENTS[document]

  const tags = {
    contact: (chunks: ReactNode) => <AppLink href={ROUTES.contact}>{chunks}</AppLink>,
    pricing: (chunks: ReactNode) => <AppLink href={ROUTES.pricing}>{chunks}</AppLink>,
    refund: (chunks: ReactNode) => <AppLink href={ROUTES.refundPolicy}>{chunks}</AppLink>,
    privacy: (chunks: ReactNode) => <AppLink href={ROUTES.privacy}>{chunks}</AppLink>,
    terms: (chunks: ReactNode) => <AppLink href={ROUTES.terms}>{chunks}</AppLink>,
    b: (chunks: ReactNode) => <strong>{chunks}</strong>,
  }

  const lastUpdated = format.dateTime(new Date(`${LEGAL_LAST_UPDATED}T00:00:00Z`), {
    dateStyle: 'long',
    timeZone: 'UTC',
  })

  return (
    <PageShell as='article' width='prose' className='flex flex-col gap-8'>
      <PageHeader title={t(`${document}Title`)} subtitle={t('lastUpdated', { date: lastUpdated })} />

      {intro && <AppParagraph className='m-0'>{t.rich(`${document}.intro`, tags)}</AppParagraph>}

      {Object.entries(sections).map(([section, paragraphs], index) => (
        <section key={section} className='flex flex-col gap-3'>
          <AppTitle level='h2' size='h3'>
            {`${index + 1}. ${t(`${document}.sections.${section}.title`)}`}
          </AppTitle>
          {Array.from({ length: paragraphs }, (_, paragraph) => (
            <AppParagraph key={paragraph} className='m-0'>
              {t.rich(`${document}.sections.${section}.p${paragraph + 1}`, tags)}
            </AppParagraph>
          ))}
        </section>
      ))}
    </PageShell>
  )
}
