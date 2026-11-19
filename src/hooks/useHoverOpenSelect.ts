'use client'

import { MouseEvent, RefObject, useEffect, useRef, useState } from 'react'
import type { RefSelectProps } from 'antd/es/select'

/** Long enough to cross the gap between the control and its portaled popup. */
const CLOSE_DELAY_MS = 150

type HoverHandlers = {
  onMouseEnter: () => void
  onMouseLeave: () => void
}

type HoverOpenSelect = {
  open: boolean
  /** For `onChange`: a pick closes the list straight away. */
  close: () => void
  selectRef: RefObject<RefSelectProps | null>
  /** Spread on the box around the `Select`. */
  wrapperProps: HoverHandlers & { onMouseDownCapture: (event: MouseEvent) => void }
  /** Spread on a box in `popupRender` when the list is portaled out of the wrapper. */
  popupProps: HoverHandlers
  onOpenChange: (next: boolean) => void
}

/**
 * A header `Select` that opens on hover, as well as on click and keyboard — the language
 * picker and the account menu.
 *
 * rc-select toggles its list on **mousedown**, not click. So the press that lands as the
 * pointer arrives — the list already open from the hover — would shut it again. The first
 * press on the control after a hover-open is swallowed; a later one still toggles. A press
 * inside the list (an option) is never swallowed.
 *
 * Hover only counts on a fine pointer. A phone tap fires mouseenter and then the press,
 * so opening on that enter would let the press toggle the list shut.
 */
export const useHoverOpenSelect = (): HoverOpenSelect => {
  const [open, setOpen] = useState(false)
  const selectRef = useRef<RefSelectProps>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fineHover = useRef(false)
  const swallowNextPress = useRef(false)

  const cancelClose = (): void => {
    if (closeTimer.current === null) return
    clearTimeout(closeTimer.current)
    closeTimer.current = null
  }

  const close = (): void => {
    cancelClose()
    swallowNextPress.current = false
    setOpen(false)
  }

  useEffect(() => {
    const query = window.matchMedia('(hover: hover) and (pointer: fine)')
    const sync = (): void => {
      fineHover.current = query.matches
    }
    sync()
    query.addEventListener('change', sync)
    return () => {
      query.removeEventListener('change', sync)
      cancelClose()
    }
  }, [])

  const onMouseEnter = (): void => {
    if (!fineHover.current) return
    cancelClose()
    swallowNextPress.current = true
    setOpen(true)
  }

  const onMouseLeave = (): void => {
    if (!fineHover.current) return
    cancelClose()
    closeTimer.current = setTimeout(close, CLOSE_DELAY_MS)
  }

  const onMouseDownCapture = (event: MouseEvent): void => {
    if (!swallowNextPress.current) return
    swallowNextPress.current = false
    const control = selectRef.current?.nativeElement
    if (!control?.contains(event.target as Node)) return
    // rc-select's own handler would focus its input and stop a press on the avatar or the
    // prefix from blurring it — a blur closes the list. Both are on us now.
    event.stopPropagation()
    event.preventDefault()
    selectRef.current?.focus()
  }

  const onOpenChange = (next: boolean): void => {
    if (!next) {
      close()
      return
    }
    cancelClose()
    setOpen(true)
  }

  return {
    open,
    close,
    selectRef,
    wrapperProps: { onMouseEnter, onMouseLeave, onMouseDownCapture },
    popupProps: { onMouseEnter, onMouseLeave },
    onOpenChange,
  }
}
