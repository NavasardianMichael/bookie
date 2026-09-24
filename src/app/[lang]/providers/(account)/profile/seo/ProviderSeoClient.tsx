'use client'

import { FC, useCallback, useEffect, useMemo, useState } from 'react'
import { CopyOutlined, ExportOutlined, ShareAltOutlined } from '@ant-design/icons'
import type { InputProps } from 'antd'
import { Alert, App, Divider, Form, Space } from 'antd'
import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { getProviderProfileAPI, patchProviderSeoAPI } from '@api/providers/main'
import { ProviderSeo } from '@store/providers/profile/types'
import { DEFAULT_LOCALE, isLocale } from '@i18n/config'
import { localePath } from '@i18n/pathname'
import { ROUTES } from '@constants/routes'
import { isFormValidationError } from '@helpers/error'
import { resolveAvatarSrc } from '@helpers/images'
import { getSiteUrl } from '@helpers/url'
import { SettingsActionBar } from '@components/settings/SettingsActionBar'
import { AppButton } from '@components/ui/AppButton'
import { AppFormItem } from '@components/ui/AppFormItem'
import { AppInput } from '@components/ui/AppInput'
import { AppTextArea } from '@components/ui/AppTextArea'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppText } from '@components/ui/bare/AppText'
import { ErrorAlert } from '@components/ui/ErrorAlert'
import { GlobeIcon } from '@components/ui/icons'
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

/** Length in code points, matching the server's cap. */
const clampChars = (value: string, max: number): string => [...value].slice(0, max).join('')

/**
 * ASCII slug from a display name, so an empty vanity field can still show the address
 * that *would* be claimed. Non-Latin names yield `''` rather than a homograph.
 */
const suggestSlug = (value: string): string => {
  const slug = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG)

  if (slug.length < MIN_SLUG || !isWellFormedSlug(slug)) return ''
  return slug
}

type FormValues = {
  seoTitle: string
  seoDescription: string
  slug: string
}

const EMPTY: FormValues = { seoTitle: '', seoDescription: '', slug: '' }

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

const toFormValues = (
  seo: ProviderSeo | undefined,
  fallback: { title: string; description: string; slug: string }
): FormValues => ({
  seoTitle: seo?.title ?? fallback.title,
  seoDescription: seo?.description ?? fallback.description,
  slug: seo?.slug ?? fallback.slug,
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
 * shows the fallback rather than an empty line. The inputs are prefilled with that
 * default so the provider sees what search actually uses, not a blank box.
 */
export const ProviderSeoClient = () => {
  const t = useTranslations('Settings.seo')
  const tActions = useTranslations('Settings.actions')
  const tCommon = useTranslations('Common')
  const tErrors = useTranslations('Errors')
  const { message } = App.useApp()
  const locale = useLocale()
  const [form] = Form.useForm<FormValues>()

  const [saved, setSaved] = useState<FormValues>(EMPTY)
  const [fallback, setFallback] = useState<{ title: string; description: string; slug: string }>({
    title: '',
    description: '',
    slug: '',
  })
  const [previewImage, setPreviewImage] = useState<string | undefined>()
  const [persistedSlug, setPersistedSlug] = useState('')
  const [profileId, setProfileId] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [revision, setRevision] = useState(0)

  const title = Form.useWatch('seoTitle', form) ?? ''
  const description = Form.useWatch('seoDescription', form) ?? ''
  const slug = Form.useWatch('slug', form) ?? ''

  // `loading` is derived from the request's identity, never set at the top of the effect.
  const request = useMemo(() => ({ revision }), [revision])
  const [fulfilled, setFulfilled] = useState<object | null>(null)
  const loading = fulfilled !== request

  useEffect(() => {
    let cancelled = false
    void getProviderProfileAPI()
      .then((profile) => {
        if (cancelled) return
        const name = `${profile.basic.firstName} ${profile.basic.lastName}`.trim()
        const organization = profile.basic.organization?.basic.name
        const categories = profile.basic.categories?.map((category) => category.name) ?? []
        // What the public page composes when an override is absent, reproduced here so
        // the fields and the preview show the real fallback rather than an empty line.
        // It mirrors `generateMetadata` in `providers/[providerId]/page.tsx`.
        const nextFallback = {
          title: clampChars(
            [name, organization, categories.join(', ')].filter(Boolean).join(' | '),
            MAX_TITLE
          ),
          description: clampChars(
            organization
              ? t('fallbackWithOrganization', { name, organization })
              : t('fallbackDescription', { name }),
            MAX_DESCRIPTION
          ),
          slug: suggestSlug(organization || name),
        }
        const values = toFormValues(profile.seo, {
          ...nextFallback,
          // A saved slug is the address already published. With none, the field shows the
          // profile id — the same segment `/providers/:id` already opens the page with.
          // It is display only: save treats that id as "no custom slug".
          slug: profile.seo?.slug || profile.id,
        })
        setFallback(nextFallback)
        // The photo Save draft writes lives on `draft.imageUrl`; the live column stays
        // `/logo.svg` until Publish. Reading `basic.image` alone hid that upload.
        // The seeded mark is still excluded — a share card will not render it. The
        // well below crops whatever remains to the 1200×630 ratio those cards use.
        const portrait = profile.draft?.imageUrl ?? profile.basic.image
        setPreviewImage(resolveAvatarSrc(portrait || undefined))
        setPersistedSlug(profile.seo?.slug ?? '')
        setProfileId(profile.id)
        setSaved(values)
        form.setFieldsValue(values)
        setLoadError(null)
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err)
      })
      .finally(() => {
        if (!cancelled) setFulfilled(request)
      })
    return () => {
      cancelled = true
    }
  }, [form, request, t])

  /**
   * `useLocale()` is typed `string` — it reads the active segment, which nothing at the
   * type level guarantees is one of ours. Narrowed once here rather than at each of the
   * two call sites below.
   */
  const activeLocale = isLocale(locale) ? locale : DEFAULT_LOCALE

  const vanityUrlFor = useCallback(
    (value: string) =>
      `${getSiteUrl()}${localePath(activeLocale, value ? `${ROUTES.providerVanity}/${value}` : ROUTES.providers)}`,
    [activeLocale]
  )

  const typedSlug = slug.trim().toLowerCase()
  /** What the preview shows. An empty field still points at the page the id already opens. */
  const previewUrl = vanityUrlFor(typedSlug || profileId || '')
  const fieldUrl = typedSlug ? vanityUrlFor(typedSlug) : null

  const copyLink = async () => {
    if (!fieldUrl) return
    try {
      await navigator.clipboard.writeText(fieldUrl)
      message.success(tCommon('linkCopied'))
    } catch {
      message.error(tCommon('copyFailed'))
    }
  }

  const openPage = () => {
    if (!fieldUrl) return
    window.open(fieldUrl, '_blank', 'noopener,noreferrer')
  }

  const handleSave = async () => {
    let values: FormValues
    try {
      values = await form.validateFields()
    } catch (err) {
      // A field that failed its rules is already marked under that field.
      if (!isFormValidationError(err)) setError(err)
      return
    }
    setSaving(true)
    setError(null)
    try {
      // `''` rather than `undefined` for the cleared text fields: absent means "leave
      // this column alone", and the provider emptying a box means the opposite.
      const segment = values.slug.trim().toLowerCase()
      const next = await patchProviderSeoAPI({
        seoTitle: values.seoTitle.trim(),
        seoDescription: values.seoDescription.trim(),
        // The id is the page's default address, not a vanity slug. Sending it would be
        // rejected — a slug must not look like a profile id.
        slug: !segment || segment === profileId?.toLowerCase() ? '' : segment,
      })
      const applied = toFormValues(next, fallback)
      applied.slug = next.slug || profileId || ''
      setPersistedSlug(next.slug ?? '')
      setSaved(applied)
      form.setFieldsValue(applied)
      setDirty(false)
      message.success(t('saved'))
    } catch (err) {
      setError(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className='flex flex-col gap-6'>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      {error !== null && <ErrorAlert error={error} overrides={{ 409: tErrors('conflicts.slugTaken') }} />}

      {loadError !== null ? (
        <ErrorAlert
          error={loadError}
          title={tErrors('pages.settings')}
          onRetry={() => setRevision((current) => current + 1)}
          retrying={loading}
        />
      ) : (
        <Form
          form={form}
          layout='vertical'
          initialValues={EMPTY}
          disabled={saving}
          onValuesChange={() => setDirty(true)}
          className='flex flex-col gap-6'
        >
          <Surface className='flex flex-col gap-6 [&_.ant-form-item-label>label]:font-semibold'>
            <h2 className='text-h3 flex items-center gap-2 font-bold'>
              <GlobeIcon className='text-brand h-5 w-5' />
              {t('searchAppearance')}
            </h2>

            <AppFormItem
              name='seoTitle'
              label={t('seoTitle')}
              extra={
                <AppText className='text-xs' tone={counterTone(title.length, GOOD_TITLE_FROM, MAX_TITLE)}>
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
                  className='text-xs'
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

            <AppFormItem
              name='slug'
              label={t('vanityUrl')}
              extra={
                <AppText className='text-xs' tone='muted'>
                  {t('slugHint', { min: MIN_SLUG, max: MAX_SLUG })}
                </AppText>
              }
              rules={[
                {
                  validator: (_, value: string | undefined) => {
                    const candidate = (value ?? '').trim().toLowerCase()
                    if (!candidate || candidate === profileId?.toLowerCase()) return Promise.resolve()
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
                placeholder={fallback.slug || t('slugPlaceholder')}
                maxLength={MAX_SLUG}
                suffix={
                  <span className='inline-flex items-center'>
                    <AppButton
                      type='text'
                      shape='circle'
                      size='small'
                      htmlType='button'
                      className='text-brand-muted'
                      icon={<CopyOutlined />}
                      aria-label={t('copyLink')}
                      disabled={!typedSlug}
                      onClick={() => void copyLink()}
                    />
                    <AppButton
                      type='text'
                      shape='circle'
                      size='small'
                      htmlType='button'
                      className='text-brand-muted'
                      icon={<ExportOutlined />}
                      aria-label={t('openPage')}
                      disabled={!typedSlug}
                      onClick={openPage}
                    />
                  </span>
                }
              />
            </AppFormItem>

            {/* Only once a slug exists and the provider is changing it — a warning about
                breaking a link nobody has yet is noise. */}
            {persistedSlug && slug.trim().toLowerCase() !== persistedSlug && (
              <Alert type='warning' showIcon title={t('slugChangeWarning', { slug: persistedSlug })} />
            )}

            <Divider styles={{ root: { margin: 0 } }} />

            {/* The share card, kept apart from the fields. The heading matches Search
                appearance. The image well is the 1200×630 Open Graph frame. */}
            <div className='flex w-full max-w-xl flex-col gap-1.5'>
              <h2 className='text-h3 flex items-center gap-2 font-bold'>
                <ShareAltOutlined className='text-brand text-xl' />
                {t('previewLabel')}
              </h2>
              <div className='bg-surface-sunken border-brand-border overflow-hidden rounded-brand border'>
                {previewImage && (
                  <div className='bg-surface relative aspect-[1200/630] w-full overflow-hidden'>
                    <Image
                      src={previewImage}
                      alt={title || fallback.title || t('previewEmptyTitle')}
                      fill
                      sizes='(max-width: 576px) 100vw, 576px'
                      className='object-cover'
                    />
                  </div>
                )}
                <div className='flex flex-col gap-1 p-4'>
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
              </div>
            </div>
          </Surface>
        </Form>
      )}

      {/* No Save over settings that never loaded: it would write the empty defaults. */}
      {loadError === null && (
        <SettingsActionBar
          dirty={dirty}
          pendingAction={saving ? 'save' : null}
          onDiscard={() => {
            form.setFieldsValue(saved)
            setDirty(false)
          }}
          onSave={() => void handleSave()}
          saveLabel={tActions('save')}
          discardLabel={tActions('discard')}
        />
      )}
    </div>
  )
}
