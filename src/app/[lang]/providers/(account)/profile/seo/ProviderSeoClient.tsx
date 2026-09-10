'use client'

import { FC, useCallback, useEffect, useState } from 'react'
import type { InputProps } from 'antd'
import { Alert, App, Form, Select, Space } from 'antd'
import { useLocale, useTranslations } from 'next-intl'
import { getProviderProfileAPI, patchProviderSeoAPI } from '@api/providers/main'
import { ProviderSeo } from '@store/providers/profile/types'
import { DEFAULT_LOCALE, isLocale } from '@i18n/config'
import { localePath } from '@i18n/pathname'
import { ROUTES } from '@constants/routes'
import { processError } from '@helpers/error'
import { getSiteUrl } from '@helpers/url'
import { SettingsActionBar } from '@components/settings/SettingsActionBar'
import { AppButton } from '@components/ui/AppButton'
import { AppFormItem } from '@components/ui/AppFormItem'
import { AppInput } from '@components/ui/AppInput'
import { AppTextArea } from '@components/ui/AppTextArea'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppText } from '@components/ui/bare/AppText'
import { CopyIcon, GlobeIcon } from '@components/ui/icons'
import { PageHeader } from '@components/ui/layout/PageHeader'
import { Surface } from '@components/ui/layout/Surface'

/**
 * Mirrors `server/src/services/providerSeo.ts`. The client counts against the same caps
 * the API enforces, so the counter and the rejection can never disagree — and because the
 * server *rejects* rather than truncates, a mismatch would show as a failed save with no
 * visible cause.
 */
const MAX_TITLE = 60
const MAX_DESCRIPTION = 160
const MAX_KEYWORDS = 10
const MIN_SLUG = 3
const MAX_SLUG = 40

/** The bands Google actually renders in full. Below them a result looks unfinished. */
const GOOD_TITLE_FROM = 30
const GOOD_DESCRIPTION_FROM = 70

/**
 * Mirrors `isWellFormedSlug` in `server/src/services/providerSeo.ts`, and is written the
 * same flat way for the same reason: the nested-quantifier form reads as a ReDoS risk to
 * the linter even though it is linear here.
 */
const SLUG_CHARS = /^[a-z0-9-]+$/

const isWellFormedSlug = (value: string): boolean =>
  SLUG_CHARS.test(value) && !value.startsWith('-') && !value.endsWith('-') && !value.includes('--')

type FormValues = {
  seoTitle: string
  seoDescription: string
  seoKeywords: string[]
  slug: string
}

const EMPTY: FormValues = { seoTitle: '', seoDescription: '', seoKeywords: [], slug: '' }

/**
 * Vanity-slug field. antd 6 replaced `addonBefore` with `Space.Compact`, and Compact
 * cannot sit as the direct child of a named `Form.Item` — antd would land `value` /
 * `onChange` on the wrapper. This implements the control contract and forwards those
 * props to the real input.
 */
type SlugInputProps = Omit<InputProps, 'addonBefore' | 'addonAfter'> & {
  urlPrefix: string
}

const SlugInput: FC<SlugInputProps> = ({ urlPrefix, ...props }) => (
  <Space.Compact className='w-full'>
    <AppInput disabled value={urlPrefix} styles={{ root: { width: 'auto', flex: 'none' } }} />
    <AppInput {...props} />
  </Space.Compact>
)

const toFormValues = (seo: ProviderSeo | undefined): FormValues => ({
  seoTitle: seo?.title ?? '',
  seoDescription: seo?.description ?? '',
  seoKeywords: seo?.keywords ? seo.keywords.split(',').map((keyword) => keyword.trim()).filter(Boolean) : [],
  slug: seo?.slug ?? '',
})

/** How full a field is, as the counter's tone. */
const counterTone = (length: number, good: number, max: number): 'muted' | 'brand' | 'danger' => {
  if (length > max) return 'danger'
  if (length >= good) return 'brand'
  return 'muted'
}

/**
 * Owner-authored search metadata and the vanity link.
 *
 * **Everything here saves live, not into the draft overlay** that the other public tabs
 * use — a deliberate departure from them. The draft model exists so a provider can rework
 * the *visible* page without it going out half-finished; a title tag has no half-finished
 * state, and the fields are only ever read by a crawler. Running two save mechanisms on
 * one screen — a drafted description beside a live address — would be the confusing part,
 * so the whole tab is one Save.
 *
 * **Every field is an override.** Emptying one restores the composed default (name,
 * organization, categories) rather than blanking the tag, which is why the preview below
 * shows the fallback rather than an empty line.
 */
export const ProviderSeoClient = () => {
  const t = useTranslations('Settings.seo')
  const tActions = useTranslations('Settings.actions')
  const { message } = App.useApp()
  const locale = useLocale()
  const [form] = Form.useForm<FormValues>()

  const [saved, setSaved] = useState<FormValues>(EMPTY)
  const [fallback, setFallback] = useState<{ title: string; description: string }>({ title: '', description: '' })
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const title = Form.useWatch('seoTitle', form) ?? ''
  const description = Form.useWatch('seoDescription', form) ?? ''
  const slug = Form.useWatch('slug', form) ?? ''

  useEffect(() => {
    void getProviderProfileAPI()
      .then((profile) => {
        const values = toFormValues(profile.seo)
        setSaved(values)
        form.setFieldsValue(values)

        // What the public page composes when an override is absent, reproduced here so
        // the preview shows the real fallback rather than an empty line. It mirrors
        // `generateMetadata` in `providers/[providerId]/page.tsx`.
        const name = `${profile.basic.firstName} ${profile.basic.lastName}`.trim()
        const organization = profile.basic.organization?.basic.name
        const categories = profile.basic.categories?.map((category) => category.name) ?? []
        setFallback({
          title: [name, organization, categories.join(', ')].filter(Boolean).join(' | '),
          description: organization
            ? t('fallbackWithOrganization', { name, organization })
            : t('fallbackDescription', { name }),
        })
      })
      .catch((err) => setError(processError(err).message))
  }, [form, t])

  /**
   * `useLocale()` is typed `string` — it reads the active segment, which nothing at the
   * type level guarantees is one of ours. Narrowed once here rather than at each of the
   * four call sites below.
   */
  const activeLocale = isLocale(locale) ? locale : DEFAULT_LOCALE

  const vanityUrlFor = useCallback(
    (value: string) =>
      `${getSiteUrl()}${localePath(activeLocale, value ? `${ROUTES.providerVanity}/${value}` : ROUTES.providers)}`,
    [activeLocale]
  )

  /** What the preview shows: the link as it would be with the *unsaved* slug. */
  const previewUrl = vanityUrlFor(slug.trim().toLowerCase())

  const handleSave = async () => {
    const values = await form.validateFields()
    setSaving(true)
    setError(null)
    try {
      // `''` rather than `undefined` for the cleared text fields: absent means "leave
      // this column alone", and the provider emptying a box means the opposite.
      const next = await patchProviderSeoAPI({
        seoTitle: values.seoTitle.trim(),
        seoDescription: values.seoDescription.trim(),
        seoKeywords: values.seoKeywords ?? [],
        slug: values.slug.trim(),
      })
      const applied = toFormValues(next)
      setSaved(applied)
      form.setFieldsValue(applied)
      setDirty(false)
      message.success(t('saved'))
    } catch (err) {
      setError(processError(err).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className='flex flex-col gap-6'>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      {error && <Alert type='error' showIcon message={error} />}

      <Form
        form={form}
        layout='vertical'
        initialValues={EMPTY}
        onValuesChange={() => setDirty(true)}
        className='flex flex-col gap-6'
      >
        <Surface className='flex flex-col gap-6'>
          <h2 className='text-h3 flex items-center gap-2 font-bold'>
            <GlobeIcon className='text-brand h-5 w-5' />
            {t('searchAppearance')}
          </h2>

          <AppFormItem
            name='seoTitle'
            label={t('seoTitle')}
            extra={
              <AppText size='caption' tone={counterTone(title.length, GOOD_TITLE_FROM, MAX_TITLE)}>
                {t('counter', { count: title.length, max: MAX_TITLE })} · {t('seoTitleHint')}
              </AppText>
            }
            rules={[{ max: MAX_TITLE, message: t('tooLong', { max: MAX_TITLE }) }]}
          >
            <AppInput placeholder={fallback.title || t('seoTitlePlaceholder')} maxLength={MAX_TITLE} />
          </AppFormItem>

          <AppFormItem
            name='seoDescription'
            label={t('seoDescription')}
            extra={
              <AppText
                size='caption'
                tone={counterTone(description.length, GOOD_DESCRIPTION_FROM, MAX_DESCRIPTION)}
              >
                {t('counter', { count: description.length, max: MAX_DESCRIPTION })} · {t('seoDescriptionHint')}
              </AppText>
            }
            rules={[{ max: MAX_DESCRIPTION, message: t('tooLong', { max: MAX_DESCRIPTION }) }]}
          >
            <AppTextArea
              rows={3}
              maxLength={MAX_DESCRIPTION}
              placeholder={fallback.description || t('seoDescriptionPlaceholder')}
            />
          </AppFormItem>

          {/* A real preview of the result, because these two fields are the only ones in
              the app whose output the provider never otherwise sees. */}
          <div className='bg-surface-sunken border-brand-border flex flex-col gap-1 rounded-brand border p-4'>
            <AppText size='overline' tone='muted' className='font-semibold'>
              {t('previewLabel')}
            </AppText>
            <AppText size='caption' tone='muted' className='block truncate'>
              {previewUrl}
            </AppText>
            <AppText size='body' className='text-brand block font-semibold'>
              {title || fallback.title || t('previewEmptyTitle')}
            </AppText>
            <AppParagraph size='body-sm' className='m-0'>
              {description || fallback.description || t('previewEmptyDescription')}
            </AppParagraph>
          </div>
        </Surface>

        <Surface className='flex flex-col gap-6'>
          <h2 className='text-h3 font-bold'>{t('keywords')}</h2>
          {/* Said plainly rather than left implied: a field that quietly does nothing is
              worse than a labelled one. */}
          <AppParagraph size='body-sm'>{t('keywordsHint')}</AppParagraph>

          <AppFormItem
            name='seoKeywords'
            label={t('keywordsLabel')}
            rules={[
              {
                validator: (_, value: string[] | undefined) =>
                  (value?.length ?? 0) <= MAX_KEYWORDS
                    ? Promise.resolve()
                    : Promise.reject(new Error(t('tooManyKeywords', { max: MAX_KEYWORDS }))),
              },
            ]}
          >
            <Select
              mode='tags'
              tokenSeparators={[',']}
              placeholder={t('keywordsPlaceholder')}
              maxTagCount='responsive'
              // No `options`: the whole point is free text the provider types.
              options={[]}
              suffixIcon={null}
            />
          </AppFormItem>
        </Surface>

        <Surface className='flex flex-col gap-6'>
          <h2 className='text-h3 font-bold'>{t('vanityUrl')}</h2>
          <AppParagraph size='body-sm'>{t('vanityHint')}</AppParagraph>

          <AppFormItem
            name='slug'
            label={t('slugLabel')}
            extra={
              <AppText size='caption' tone='muted'>
                {t('slugHint', { min: MIN_SLUG, max: MAX_SLUG })}
              </AppText>
            }
            rules={[
              {
                validator: (_, value: string | undefined) => {
                  const candidate = (value ?? '').trim().toLowerCase()
                  if (!candidate) return Promise.resolve()
                  if (candidate.length < MIN_SLUG || candidate.length > MAX_SLUG) {
                    return Promise.reject(new Error(t('slugLength', { min: MIN_SLUG, max: MAX_SLUG })))
                  }
                  // ASCII-only, matching the server. A Cyrillic homograph would produce a
                  // link that reads as someone else's.
                  if (!isWellFormedSlug(candidate)) return Promise.reject(new Error(t('slugPattern')))
                  return Promise.resolve()
                },
              },
            ]}
          >
            <SlugInput
              urlPrefix={`${getSiteUrl()}${localePath(activeLocale, ROUTES.providerVanity)}/`}
              placeholder={t('slugPlaceholder')}
              maxLength={MAX_SLUG}
            />
          </AppFormItem>

          {saved.slug && (
            <div className='bg-surface-sunken border-brand-border flex items-center justify-between gap-3 rounded-brand border p-3'>
              <div className='min-w-0'>
                <AppText size='caption' tone='muted' className='font-bold uppercase'>
                  {t('yourLink')}
                </AppText>
                <AppParagraph className='truncate font-semibold' tone='default'>
                  {vanityUrlFor(saved.slug)}
                </AppParagraph>
              </div>
              <AppButton
                type='default'
                icon={<CopyIcon className='h-4 w-4' />}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(vanityUrlFor(saved.slug))
                    message.success(t('copied'))
                  } catch {
                    message.error(t('copyFailed'))
                  }
                }}
              >
                {t('copy')}
              </AppButton>
            </div>
          )}

          {/* Only once a slug exists and the provider is changing it — a warning about
              breaking a link nobody has yet is noise. */}
          {saved.slug && slug.trim().toLowerCase() !== saved.slug && (
            <Alert type='warning' showIcon message={t('slugChangeWarning', { slug: saved.slug })} />
          )}
        </Surface>
      </Form>

      <SettingsActionBar
        dirty={dirty}
        saving={saving}
        onDiscard={() => {
          form.setFieldsValue(saved)
          setDirty(false)
        }}
        onSave={() => void handleSave()}
        saveLabel={tActions('save')}
        discardLabel={tActions('discard')}
      />
    </div>
  )
}
