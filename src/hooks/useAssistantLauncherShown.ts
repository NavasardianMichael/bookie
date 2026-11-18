import { useAuthStore } from '@store/auth/store'
import { USER_TYPES } from '@constants/auth'

/**
 * Whether the AI assistant's floating button is on screen: a signed-in provider, any plan.
 * Read by the launcher itself and by what shares its bottom end corner (`SettingsActionBar`).
 */
export const useAssistantLauncherShown = (): boolean => {
  const isSignedOn = useAuthStore.use.isSignedOn()
  const userType = useAuthStore.use.userType()
  return isSignedOn && userType === USER_TYPES.provider
}
