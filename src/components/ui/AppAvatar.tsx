import { FC } from 'react'
import Image from 'next/image'
import { cn } from '@helpers/cn'
import { getInitials, resolveAssetUrl } from '@helpers/images'

export type AppAvatarProps = {
  src?: string
  /** Used for the alt text and for the initials fallback. */
  name: string
  size?: number
  shape?: 'circle' | 'square'
  className?: string
}

/**
 * The fallback is the common case today — uploaded image paths do not resolve and
 * the seed points at the logo — so it has to look deliberate rather than broken.
 */
export const AppAvatar: FC<AppAvatarProps> = ({ src, name, size = 48, shape = 'circle', className }) => {
  const resolved = resolveAssetUrl(src)
  const radius = shape === 'circle' ? 'rounded-full' : 'rounded-brand'

  return (
    <span
      className={cn(
        'bg-brand-100 text-brand-700 relative flex shrink-0 items-center justify-center overflow-hidden font-semibold select-none',
        radius,
        className
      )}
      style={{ width: size, height: size, fontSize: Math.max(12, Math.round(size * 0.36)) }}
    >
      {resolved ? (
        <Image src={resolved} alt={name} fill sizes={`${size}px`} className='object-cover' />
      ) : (
        <span aria-hidden='true'>{getInitials(name)}</span>
      )}
    </span>
  )
}
