'use client'

import { FC } from 'react'
import { cn } from '@helpers/cn'
import { AppButton } from '@components/ui/AppButton'
import { AppText } from '@components/ui/bare/AppText'

export type SettingsActionBarProps = {
  dirty?: boolean
  saving?: boolean
  onDiscard?: () => void
  onSave?: () => void
  /** Provider draftable tabs. */
  onSaveDraft?: () => void
  onPublish?: () => void
  saveLabel?: string
  discardLabel?: string
  saveDraftLabel?: string
  publishLabel?: string
  className?: string
}

/**
 * Sticky bottom bar for settings forms. No autosave — explicit Discard / Save
 * (and optional Save draft / Save and publish for providers).
 */
export const SettingsActionBar: FC<SettingsActionBarProps> = ({
  dirty = false,
  saving = false,
  onDiscard,
  onSave,
  onSaveDraft,
  onPublish,
  saveLabel = 'Save Changes',
  discardLabel = 'Discard',
  saveDraftLabel = 'Save draft',
  publishLabel = 'Save and publish',
  className,
}) => (
  <div
    className={cn(
      'border-brand-border bg-surface/90 sticky bottom-6 z-40 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 shadow-lg backdrop-blur',
      className
    )}
  >
    <AppText size='body-sm' tone='muted' className='font-bold'>
      {dirty ? 'Unsaved changes' : 'No changes yet'}
    </AppText>
    <div className='flex flex-wrap items-center gap-2'>
      {onDiscard && (
        <AppButton type='default' onClick={onDiscard} disabled={!dirty || saving}>
          {discardLabel}
        </AppButton>
      )}
      {onSaveDraft && (
        <AppButton type='default' onClick={onSaveDraft} loading={saving} disabled={!dirty}>
          {saveDraftLabel}
        </AppButton>
      )}
      {onPublish && (
        <AppButton type='primary' onClick={onPublish} loading={saving}>
          {publishLabel}
        </AppButton>
      )}
      {onSave && !onPublish && (
        <AppButton type='primary' onClick={onSave} loading={saving} disabled={!dirty}>
          {saveLabel}
        </AppButton>
      )}
    </div>
  </div>
)
