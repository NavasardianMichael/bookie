'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { registerUnsavedChangesReader, suppressUnsavedChangesGuard } from '@helpers/unsavedChangesGuard'

/** Arm the leave dialog while `active` is true. The flag is read at navigation time. */
export const useUnsavedChangesGuard = (active: boolean): void => {
  const activeRef = useRef(active)

  useEffect(() => {
    activeRef.current = active
  }, [active])

  useEffect(() => registerUnsavedChangesReader(() => activeRef.current), [])
}

/**
 * For a form whose edits are `onValuesChange` and nothing else.
 * `release` is for the navigation that follows a successful submit: clearing state
 * waits for a render, and the dialog would otherwise ask after the save landed.
 */
export const useFormUnsavedGuard = (): { mark: () => void; release: () => void } => {
  const [active, setActive] = useState(false)
  useUnsavedChangesGuard(active)

  const mark = useCallback(() => setActive(true), [])
  const release = useCallback(() => {
    setActive(false)
    suppressUnsavedChangesGuard()
  }, [])

  return { mark, release }
}
