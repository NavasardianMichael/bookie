'use client'

import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { DeleteOutlined, UploadOutlined } from '@ant-design/icons'
import { Flex, Image, Upload } from 'antd'
import ImgCrop, { ImgCropProps } from 'antd-img-crop'
import { useTranslations } from 'next-intl'
import { ProviderProfileFormValues } from '@interfaces/providers'
import { AppButton } from '@components/ui/AppButton'
import { AppConfirmModal } from '@components/ui/AppConfirmModal'
import styles from './styles.module.css'

type GalleryValue = NonNullable<ProviderProfileFormValues['gallery']>

/** Injected by `Form.Item`. Entries are stored `{ name, url }` items or freshly cropped `File`s. */
type Props = {
  value?: GalleryValue
  onChange?: (next: GalleryValue) => void
  disabled?: boolean
}

const MAX_IMAGES = 10

/**
 * A stable key and preview URL for either shape an entry can take. `isObjectUrl` marks the
 * ones we minted, so cleanup revokes exactly those and never a stored `/uploads/...` path.
 */
type Preview = { key: string; name: string; url: string; isObjectUrl: boolean }

const ProviderProfileFormGalleryComponent: React.FC<Props> = ({ value, onChange, disabled }) => {
  const t = useTranslations('ProfileCreation')
  const tServices = useTranslations('Services')
  const [pendingDeleteKey, setPendingDeleteKey] = useState<string | null>(null)

  const items = useMemo<GalleryValue>(() => value ?? [], [value])

  /**
   * Derived, never mirrored into state — `react-hooks/set-state-in-effect` is an **error**
   * in this repo, and a mirrored copy is what let the strip drift from what would actually
   * be submitted.
   */
  const previews = useMemo<Preview[]>(
    () =>
      items.map((item, index): Preview => {
        if (item instanceof File) {
          return { key: `file-${index}-${item.name}`, name: item.name, url: URL.createObjectURL(item), isObjectUrl: true }
        }
        return { key: `stored-${item.name}`, name: item.name, url: item.url, isObjectUrl: false }
      }),
    [items]
  )

  // Cleanup only: without it every upload leaks a blob for the life of the page.
  useEffect(
    () => () => previews.forEach((preview) => preview.isObjectUrl && URL.revokeObjectURL(preview.url)),
    [previews]
  )

  const onModalOk = useCallback(
    (file: File | undefined) => {
      if (!file) return
      onChange?.([...items, file])
    },
    [items, onChange]
  ) as ImgCropProps['onModalOk']

  const onApproveRemove = useCallback(async () => {
    const index = previews.findIndex((preview) => preview.key === pendingDeleteKey)
    if (index >= 0) onChange?.(items.filter((_, i) => i !== index))
    setPendingDeleteKey(null)
  }, [items, onChange, pendingDeleteKey, previews])

  const onRemoveClick: React.MouseEventHandler<HTMLButtonElement> = useCallback((event) => {
    const key = event.currentTarget.name
    if (key) setPendingDeleteKey(key)
  }, [])

  const uploadDisabled = disabled || items.length >= MAX_IMAGES

  return (
    <>
      <Flex gap={8} wrap>
        <ImgCrop aspect={1} onModalOk={onModalOk}>
          {/* `customRequest` no-op, not `beforeUpload={() => false}` — see the profile image field. */}
          <Upload
            maxCount={MAX_IMAGES}
            showUploadList={false}
            disabled={uploadDisabled}
            customRequest={() => undefined}
          >
            <AppButton icon={<UploadOutlined />} className='mr-2' disabled={uploadDisabled}>
              Upload
            </AppButton>
            up to {MAX_IMAGES} pictures to your gallery
          </Upload>
        </ImgCrop>
      </Flex>

      <Flex wrap gap={8} className='mt-4! basis-25 grow-0 shrink-0'>
        {previews.map(({ key, name, url }) => (
          <Flex key={key} vertical gap={0} className='flex-1 shadow-lg'>
            <Image
              className='mx-auto rounded-tr-lg! rounded-tl-lg! block!'
              alt={name}
              src={url}
              rootClassName={styles['gallery-image-preview-root']}
            />
            <AppButton
              danger
              className='rounded-tr-none! rounded-tl-none!'
              icon={<DeleteOutlined />}
              color='red'
              onClick={onRemoveClick}
              name={key}
              disabled={disabled}
            >
              {tServices('delete')}
            </AppButton>
          </Flex>
        ))}
      </Flex>

      <AppConfirmModal
        tone='danger'
        title={t('deleteImageTitle')}
        description={t('deleteImageBody')}
        okText={tServices('delete')}
        open={!!pendingDeleteKey}
        onConfirm={onApproveRemove}
        onCancel={() => setPendingDeleteKey(null)}
      />
    </>
  )
}

export const ProviderProfileFormGallery = memo(ProviderProfileFormGalleryComponent)
