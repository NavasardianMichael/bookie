'use client'

import { useCallback, useState } from 'react'

type ValidateAfterSubmit = {
  /** For the item's `validateTrigger`: nothing until the first check, then every change. */
  validateTrigger: 'onChange' | []
  /** True once a submit has checked the field. */
  isLive: boolean
  /** Call from the field's validator. */
  markChecked: () => void
}

/**
 * Validation for a field that is invalid at every keystroke until the last one — a phone
 * number, a website, a search that must end in a pick. Checking it on change reports an
 * error on the first digit typed, which is the complaint this hook exists to answer.
 *
 * So the item does not validate while the user types until a submit has checked it once;
 * from then on it re-checks on every change, and the error clears the moment the value
 * becomes valid.
 *
 * The switch is thrown from inside the validator. While the trigger is off, only
 * `validateFields()` — a submit — can run it, so its first call *is* the first submit.
 */
export const useValidateAfterSubmit = (): ValidateAfterSubmit => {
  const [isLive, setIsLive] = useState(false)
  const markChecked = useCallback(() => setIsLive(true), [])

  return { validateTrigger: isLive ? 'onChange' : [], isLive, markChecked }
}
