'use client'

import { FC } from 'react'
import type { ImgCropProps } from 'antd-img-crop'
import dynamic from 'next/dynamic'

/**
 * `antd-img-crop` (and its cropper) load with this field, not with the form chunk.
 * The upload button is the child the caller passes, so that button stays in the form.
 */
const ImgCrop = dynamic(() => import('antd-img-crop'), { ssr: false })

export const LazyImgCrop: FC<ImgCropProps> = (props) => <ImgCrop {...props} />
