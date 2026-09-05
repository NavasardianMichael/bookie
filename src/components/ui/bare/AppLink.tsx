import { ComponentProps, FC, PropsWithChildren } from 'react'
import { Link } from '@i18n/navigation'
import { cn } from '@helpers/cn'

export type AppLinkVariant = 'inline' | 'plain' | 'button' | 'chip'
export type AppLinkTone = 'primary' | 'default'

type Props = ComponentProps<typeof Link> & {
  variant?: AppLinkVariant
  /** Read by the `button` variant only. */
  tone?: AppLinkTone
  block?: boolean
}

const VARIANTS: Record<AppLinkVariant, string> = {
  inline: 'text-brand underline decoration-brand/40 underline-offset-2 transition-colors hover:decoration-brand',
  plain: 'transition-colors hover:underline [text-underline-offset:5px]',
  button:
    'inline-flex min-h-12 items-center justify-center gap-2 rounded-brand-sm px-5 text-body-sm font-semibold no-underline transition-all',
  chip: 'border-brand-border bg-surface text-brand-text hover:border-brand inline-flex h-10 shrink-0 items-center gap-2 rounded-brand-sm border px-5 text-body-sm font-bold no-underline transition-colors',
}

const BUTTON_TONES: Record<AppLinkTone, string> = {
  primary: 'bg-brand hover:bg-brand-800 active:bg-brand-950 text-white shadow-sm hover:shadow-md',
  default: 'border-brand-border text-brand-text hover:border-brand hover:bg-surface active:bg-brand-50 border-2',
}

/**
 * The one anchor primitive, and the reason the app needs no `<Button href>`: the
 * `button` and `chip` variants are CSS-matched to AppButton but stay a real
 * anchor, so a call-to-action renders on the server with no antd runtime behind
 * it. They also replace the same 200-character utility string that had been
 * pasted across the home page and the contact rows.
 *
 * `tel:`, `mailto:`, absolute URLs and bare `#` fragments are not routes, so they
 * bypass the router — it cannot navigate them and a prefetch attempt is wasted.
 * The fragment case matters more than it looks: `Link` here is next-intl's, which
 * prefixes the active locale onto every href, and `#main` would become `/en#main`.
 *
 * That prefixing is the reason this component is the only place internal links
 * are built. `ROUTES` stays locale-free and every `<AppLink href={ROUTES.x}>` in
 * the app gets `/es/x` for free. Never reach for `next/link` directly.
 */
export const AppLink: FC<PropsWithChildren<Props>> = ({
  href,
  variant = 'inline',
  tone = 'default',
  block,
  target,
  rel,
  prefetch,
  replace,
  scroll,
  className,
  children,
  ...props
}) => {
  const classes = cn(VARIANTS[variant], variant === 'button' && BUTTON_TONES[tone], block && 'w-full', className)

  // Without `noopener` the opened page keeps a window.opener handle back into this one.
  const safeRel = target === '_blank' ? (rel ?? 'noopener noreferrer') : rel

  if (typeof href === 'string' && !href.startsWith('/')) {
    return (
      <a href={href} target={target} rel={safeRel} className={classes} {...props}>
        {children}
      </a>
    )
  }

  return (
    <Link
      href={href}
      target={target}
      rel={safeRel}
      prefetch={prefetch}
      replace={replace}
      scroll={scroll}
      className={classes}
      {...props}
    >
      {children}
    </Link>
  )
}
