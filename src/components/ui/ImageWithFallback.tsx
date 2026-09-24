'use client'

import { FC, ReactNode, useState } from 'react'
import Image, { ImageProps } from 'next/image'

export type ImageWithFallbackProps = ImageProps & {
  /** What renders instead when the image cannot load — usually the no-photo placeholder. */
  fallback: ReactNode
}

/**
 * `next/image` that notices it failed. A missing upload, or `/_next/image` refusing the
 * API origin (a 400), used to leave an empty image well; this swaps in the same
 * placeholder the card shows when there is no photo at all. The caller keys it on `src`,
 * so a new image gets a fresh attempt.
 */
export const ImageWithFallback: FC<ImageWithFallbackProps> = ({ fallback, onError, alt, ...props }) => {
  const [failed, setFailed] = useState(false)

  if (failed) return fallback

  return (
    <Image
      alt={alt}
      {...props}
      onError={(event) => {
        setFailed(true)
        onError?.(event)
      }}
    />
  )
}
