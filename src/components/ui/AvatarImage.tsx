'use client'

import { FC, useState } from 'react'
import Image from 'next/image'

type Props = {
  src: string
  alt: string
  size: number
  /** What shows instead when the image cannot load. */
  initials: string
}

/**
 * The photo inside `AppAvatar`, with the one thing a Server Component cannot do: notice
 * that the image failed. A missing upload, or `/_next/image` refusing the API origin (a
 * 400), used to leave an empty tinted circle; it now falls back to the initials the
 * avatar shows when there is no photo at all. `AppAvatar` keys this on `src`, so a new
 * photo gets a fresh attempt.
 */
export const AvatarImage: FC<Props> = ({ src, alt, size, initials }) => {
  const [failed, setFailed] = useState(false)

  if (failed) return <span aria-hidden='true'>{initials}</span>

  // Cropped files are only addressable as blob URLs; next/image will not load them.
  if (/^(blob:|data:)/.test(src)) {
    return (
      <img src={src} alt={alt} className='absolute inset-0 size-full object-cover' onError={() => setFailed(true)} />
    )
  }

  return <Image src={src} alt={alt} fill sizes={`${size}px`} className='object-cover' onError={() => setFailed(true)} />
}
