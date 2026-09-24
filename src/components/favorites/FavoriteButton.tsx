'use client'

import { FC, useCallback } from 'react'
import { HeartFilled, HeartOutlined } from '@ant-design/icons'
import { useTranslations } from 'next-intl'
import { BasicProvider } from '@store/providers/list/types'
import { useErrorToast } from '@hooks/useErrorToast'
import { useFavoriteProvider } from '@hooks/useFavoriteProvider'
import { useRouter } from '@i18n/navigation'
import { ROUTES } from '@constants/routes'
import { AppButton } from '@components/ui/AppButton'

type Props = {
  providerId: BasicProvider['id']
  /** The provider's name, so a screen reader hears which heart this is on a grid of them. */
  name: string
}

/**
 * The heart on a provider card.
 *
 * A client island inside a Server Component card: the card's markup still reaches the
 * crawler, and only this button hydrates. It renders "not favourited" on the server and
 * on first paint, which is also what the client renders before the ids arrive — so there
 * is no hydration mismatch to paper over.
 *
 * Shown to guests too, as a way into sign-in: a heart that appears only after signing in
 * advertises nothing. Never shown on the viewer's own card.
 */
export const FavoriteButton: FC<Props> = ({ providerId, name }) => {
  const t = useTranslations('Favorites')
  const { push } = useRouter()
  const showError = useErrorToast()
  const { isSignedOn, isFavorite, isOwn, toggle } = useFavoriteProvider(providerId)

  const onClick = useCallback(async () => {
    if (!isSignedOn) {
      push(ROUTES.signIn)
      return
    }
    try {
      await toggle()
    } catch (error) {
      // Keyed per provider, so tapping a failing heart twice shows one toast, not two.
      showError(error, { key: `favorite-${providerId}` })
    }
  }, [isSignedOn, providerId, push, showError, toggle])

  if (isOwn) return null

  const label = !isSignedOn ? t('signInToAdd', { name }) : t(isFavorite ? 'remove' : 'add', { name })

  return (
    <AppButton
      shape='circle'
      aria-label={label}
      title={label}
      // A toggle only once it is one: for a guest the button navigates, and announcing
      // "not pressed" would describe a state the click does not change.
      aria-pressed={isSignedOn ? isFavorite : undefined}
      icon={isFavorite ? <HeartFilled className='text-brand-danger' /> : <HeartOutlined />}
      onClick={onClick}
      // No `min-w-*`: antd's circle sets its own `min-width` unlayered, which beats a
      // Tailwind utility, so only the height would grow and the circle would go oval.
      className='shadow-sm'
    />
  )
}
