import { MouseEventHandler, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type Props = MouseEventHandler<HTMLButtonElement>

export const useEntityClickHandler = (onEntityClick?: Props) => {
  const { push } = useRouter()
  const onEntityClickHandler: MouseEventHandler<HTMLButtonElement> = useCallback(
    (event) => {
      if (onEntityClick) return onEntityClick
      event.preventDefault()
      const { entityName, entityId } = event.currentTarget.dataset
      push(`/${entityName}/${entityId}`)
    },
    [onEntityClick, push]
  )
  return onEntityClickHandler
}
