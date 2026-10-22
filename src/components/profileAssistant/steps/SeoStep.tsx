'use client'

import { FC } from 'react'
import { useTranslations } from 'next-intl'
import { ROUTES } from '@constants/routes'
import {
  isWellFormedSlug,
  MAX_SEO_DESCRIPTION,
  MAX_SEO_TITLE,
  MAX_SLUG_LENGTH,
  MIN_SLUG_LENGTH,
} from '@helpers/providerSeo'
import { AppFormItem } from '@components/ui/AppFormItem'
import { AppInput } from '@components/ui/AppInput'
import { AppTextArea } from '@components/ui/AppTextArea'
import { AppLink } from '@components/ui/bare/AppLink'
import { AppText } from '@components/ui/bare/AppText'

type Props = {
  /** No `customSlug` on the plan: the link is shown but not changed. */
  slugLocked: boolean
}

/**
 * The SEO tab's three fields, with its own caps and slug rules. Empty title or description
 * means the page composes its own, as on the tab. The live preview and copy buttons stay there.
 */
export const SeoStep: FC<Props> = ({ slugLocked }) => {
  const t = useTranslations('Settings.seo')

  return (
    <div className='flex flex-col gap-4 [&_.ant-form-item-label>label]:font-semibold'>
      <AppFormItem
        name='seoTitle'
        label={t('seoTitle')}
        extra={t('seoTitleHint')}
        layout='vertical'
        rules={[{ max: MAX_SEO_TITLE, message: t('tooLong', { max: MAX_SEO_TITLE }) }]}
      >
        <AppInput maxLength={MAX_SEO_TITLE} showCount placeholder={t('seoTitlePlaceholder')} />
      </AppFormItem>

      <AppFormItem
        name='seoDescription'
        label={t('seoDescription')}
        extra={t('seoDescriptionHint')}
        layout='vertical'
        rules={[{ max: MAX_SEO_DESCRIPTION, message: t('tooLong', { max: MAX_SEO_DESCRIPTION }) }]}
      >
        <AppTextArea
          autoSize={{ minRows: 2, maxRows: 5 }}
          maxLength={MAX_SEO_DESCRIPTION}
          showCount
          placeholder={t('seoDescriptionPlaceholder')}
        />
      </AppFormItem>

      <AppFormItem
        name='slug'
        label={t('vanityUrl')}
        layout='vertical'
        extra={
          <AppText className='text-xs' tone='muted'>
            {slugLocked
              ? t.rich('slugLocked', { link: (chunks) => <AppLink href={ROUTES.providerProfilePlan}>{chunks}</AppLink> })
              : t('slugHint', { min: MIN_SLUG_LENGTH, max: MAX_SLUG_LENGTH })}
          </AppText>
        }
        rules={[
          {
            validator: (_, value: string | undefined) => {
              const candidate = (value ?? '').trim().toLowerCase()
              if (!candidate || slugLocked) return Promise.resolve()
              if (candidate.length < MIN_SLUG_LENGTH || candidate.length > MAX_SLUG_LENGTH) {
                return Promise.reject(new Error(t('slugLength', { min: MIN_SLUG_LENGTH, max: MAX_SLUG_LENGTH })))
              }
              return isWellFormedSlug(candidate) ? Promise.resolve() : Promise.reject(new Error(t('slugPattern')))
            },
          },
        ]}
      >
        <AppInput
          prefix={`${ROUTES.providerPage}/`}
          maxLength={MAX_SLUG_LENGTH}
          readOnly={slugLocked}
          placeholder={t('slugPlaceholder')}
        />
      </AppFormItem>
    </div>
  )
}
