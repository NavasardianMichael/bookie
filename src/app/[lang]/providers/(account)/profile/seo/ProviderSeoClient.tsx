'use client'

import { FC, useCallback, useEffect, useMemo, useState } from 'react'
import { CopyOutlined, ExportOutlined, ShareAltOutlined } from '@ant-design/icons'
import type { InputProps } from 'antd'
import { Alert, App, Divider, Form, Space } from 'antd'
import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { getProviderProfileAPI, patchProviderSeoAPI } from '@api/providers/main'
import { ProviderSeo } from '@store/providers/profile/types'
import { ROUTES } from '@constants/routes'
import { translateCategoryName } from '@helpers/categoryName'
import { getCountryName } from '@helpers/country'
import { providerPagePath } from '@helpers/entities'
import { isFormValidationError } from '@helpers/error'
import { resolveAvatarSrc } from '@helpers/images'
import {
  composeProviderDescription,
  composeProviderTitle,
  isWellFormedSlug,
  MAX_SEO_DESCRIPTION,
  MAX_SEO_TITLE,
  MAX_SLUG_LENGTH,
  MIN_SLUG_LENGTH,
} from '@helpers/providerSeo'
import { getSiteUrl } from '@helpers/url'
import { SettingsActionBar } from '@components/settings/SettingsActionBar'
import { AppButton } from '@components/ui/AppButton'
import { AppFormItem } from '@components/ui/AppFormItem'
import { AppInput } from '@components/ui/AppInput'
import { AppTextArea } from '@components/ui/AppTextArea'
import { AppLink } from '@components/ui/bare/AppLink'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppText } from '@components/ui/bare/AppText'
import { ErrorAlert } from '@components/ui/ErrorAlert'
import { GlobeIcon } from '@components/ui/icons'
import { PageHeader } from '@components/ui/layout/PageHeader'
import { Surface } from '@components/ui/layout/Surface'

/** The API's caps, shared with the profile assistant's SEO step (`@helpers/providerSeo`). */
const MAX_TITLE = MAX_SEO_TITLE
const MAX_DESCRIPTION = MAX_SEO_DESCRIPTION
const MIN_SLUG = MIN_SLUG_LENGTH
const MAX_SLUG = MAX_SLUG_LENGTH

/** The bands Google actually renders in full. Below them a result looks unfinished. */
const GOOD_TITLE_FROM = 30
const GOOD_DESCRIPTION_FROM = 70


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

/**
 * The title and description boxes show what the page actually uses: the provider's override,
 * or else the generated value (`@helpers/providerSeo`). A box still holding the generated text
 * is saved as **no override** (`toOverride`), so it keeps following the profile — saving it as
 * text would freeze it, and a later service or category change would no longer reach it.
 */
const toFormValues = (
  seo: ProviderSeo | undefined,
  fallback: { title: string; description: string; slug: string }
): FormValues => ({
  seoTitle: seo?.title ?? fallback.title,
  seoDescription: seo?.description ?? fallback.description,
  slug: seo?.slug ?? fallback.slug,
})

/** `''` (no override, generate it) for an empty box or one still holding the generated text. */
const toOverride = (value: string, generated: string): string => {
  const trimmed = value.trim()
  return trimmed === generated.trim() ? '' : trimmed
}

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
 * **Every field is an override.** An empty box means the composed default
 * (`@helpers/providerSeo`), which follows the profile as it changes; the default shows as
 * the box's placeholder and in the preview, so the provider still sees what search uses.
 */
export const ProviderSeoClient = () => {
  const t = useTranslations('Settings.seo')
  const tProvider = useTranslations('Provider')
  const tCategories = useTranslations('Categories')
  const locale = useLocale()
  const tActions = useTranslations('Settings.actions')
  const tCommon = useTranslations('Common')
  const tErrors = useTranslations('Errors')
  const { message } = App.useApp()
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
  /**
   * A custom link is a paid feature (`entitlements.customSlug`). Without it the field is
   * read-only and the slug is left out of the save entirely — so a free provider's
   * grandfathered slug, set before links were paid, keeps working through every save of
   * the title. The API enforces the same rule; this only saves the provider a refusal.
   */
  const [slugLocked, setSlugLocked] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [revision, setRevision] = useState(0)

  const title = Form.useWatch('seoTitle', form) ?? ''
  const isGeneratedTitle = !!fallback.title && title.trim() === fallback.title.trim()
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
        const name = profile.basic.fullName
        const organization = profile.basic.organization?.basic.name
        const categories =
          profile.basic.categories?.map((category) => translateCategoryName(category.name, tCategories)) ?? []
        const country = getCountryName(profile.details.country, locale)
        const services = profile.services.allIds
          .map((id) => profile.services.byId[id!])
          .filter((service) => service && service.active !== false)
          .map((service) => service!.name)
        // What the public page composes when an override is absent — the same helpers its
        // `generateMetadata` uses (`[slug]/providerPageSeo.ts`), so the placeholders and the
        // preview show exactly what search sees.
        const nextFallback = {
          title: composeProviderTitle({ name, categories, organization, country }),
          description: composeProviderDescription({
            categories,
            services,
            intro: tProvider('fallbackDescription', { name }),
            address: profile.details.location.address,
            country,
          }),
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
        setSlugLocked(profile.personal.entitlements?.customSlug === false)
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
  }, [form, locale, request, t, tCategories, tProvider])

  // The page is `/p/<slug>`, or `/p/<id>` without one — never locale-prefixed.
  const vanityUrlFor = useCallback(
    (value: string) => `${getSiteUrl()}${providerPagePath({ id: profileId ?? '', slug: value || undefined })}`,
    [profileId]
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
        seoTitle: toOverride(values.seoTitle, fallback.title),
        seoDescription: toOverride(values.seoDescription, fallback.description),
        // The id is the page's default address, not a vanity slug. Sending it would be
        // rejected — a slug must not look like a profile id. Omitted, not cleared, when
        // the plan has no custom link: absent leaves whatever is stored alone.
        ...(slugLocked ? {} : { slug: !segment || segment === profileId?.toLowerCase() ? '' : segment }),
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
                <AppText
                  className='text-xs'
                  tone={isGeneratedTitle ? 'muted' : counterTone(title.length, GOOD_TITLE_FROM, MAX_TITLE)}
                >
                  {t('counter', { count: title.length, max: MAX_TITLE })} · {t('seoTitleHint')}
                </AppText>
              }
              rules={[
                {
                  validator: (_, value: string | undefined) =>
                    // The generated title is not the provider's text, so it is not held to their cap.
                    !value || value.trim() === fallback.title.trim() || [...value.trim()].length <= MAX_TITLE
                      ? Promise.resolve()
                      : Promise.reject(new Error(t('tooLong', { max: MAX_TITLE }))),
                },
              ]}
            >
              <AppInput
                placeholder={fallback.title || t('seoTitlePlaceholder')}
                maxLength={isGeneratedTitle ? undefined : MAX_TITLE}
              />
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
                  {slugLocked
                    ? t.rich(persistedSlug ? 'slugLockedKept' : 'slugLocked', {
                        link: (chunks) => <AppLink href={ROUTES.providerProfilePlan}>{chunks}</AppLink>,
                      })
                    : t('slugHint', { min: MIN_SLUG, max: MAX_SLUG })}
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
                urlPrefix={`${getSiteUrl()}${ROUTES.providerPage}/`}
                placeholder={fallback.slug || t('slugPlaceholder')}
                maxLength={MAX_SLUG}
                readOnly={slugLocked}
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
                <div className='flex min-w-0 flex-col gap-1 p-4'>
                  <AppText size='caption' tone='muted' className='block truncate'>
                    {previewUrl}
                  </AppText>
                  <AppText size='body' className='text-brand block min-w-0 wrap-break-word font-semibold'>
                    {title || fallback.title || t('previewEmptyTitle')}
                  </AppText>
                  <AppParagraph size='body-sm' className='m-0 min-w-0 wrap-break-word'>
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
