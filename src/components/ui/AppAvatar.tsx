import { FC } from 'react'
import Image from 'next/image'
import { cn } from '@helpers/cn'
import { getInitials, resolveAvatarSrc } from '@helpers/images'

export type AppAvatarProps = {
  src?: string
  /** Used for the alt text and for the initials fallback. */
  name: string
  size?: number
  shape?: 'circle' | 'square'
  className?: string
}

/**
 * Initials when there is no real photo. The seed still stores `/logo.svg` on
 * `imageUrl`; painting that as a face put the site mark in the header.
 */
export const AppAvatar: FC<AppAvatarProps> = ({ src, name, size = 48, shape = 'circle', className }) => {
  const resolved = resolveAvatarSrc(src)
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
        /^(blob:|data:)/.test(resolved) ? (
          // Cropped files are only addressable as blob URLs; next/image will not load them.
          <img src={resolved} alt={name} className='absolute inset-0 size-full object-cover' />
        ) : (
          <Image key={resolved} src={resolved} alt={name} fill sizes={`${size}px`} className='object-cover' />
        )
      ) : (
        <span aria-hidden='true'>{getInitials(name)}</span>
      )}
    </span>
  )
}
