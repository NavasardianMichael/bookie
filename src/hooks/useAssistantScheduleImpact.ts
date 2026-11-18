import { useCallback } from 'react'
import { AssistantAction } from '@api/assistant/types'
import { getProviderProfileAPI } from '@api/providers/main'
import { useScheduleImpact } from '@hooks/useScheduleImpact'
import { hoursAfterSchedulePatch, isScheduleAction, LiveHours, toSchedulePatch } from '@helpers/assistant'
import { hasImpact, ScheduleImpact } from '@helpers/scheduleConflicts'

export type AssistantScheduleImpact = { impact: ScheduleImpact; timeZone?: string }

/**
 * What a proposal's hours changes would do to the services and upcoming bookings that depend on
 * the live hours — the check the Availability tab runs before Publish, run before Apply. Resolves
 * to `null` when the proposal leaves the hours alone or nothing is affected; rejects when the
 * profile or the bookings cannot be read, so the caller shows that instead of applying blind.
 */
export const useAssistantScheduleImpact = (): ((
  actions: readonly AssistantAction[]
) => Promise<AssistantScheduleImpact | null>) => {
  const checkImpact = useScheduleImpact()

  return useCallback(
    async (actions) => {
      const patch = toSchedulePatch(actions.filter(isScheduleAction))
      if (!patch) return null

      const profile = await getProviderProfileAPI()
      const before: LiveHours = {
        rule: profile.details.scheduleRule,
        weekSchedule: profile.details.weekSchedule,
        specialDates: profile.details.specialDates ?? [],
      }
      const after = hoursAfterSchedulePatch(before, patch)
      if (!after) return null

      // Both sides read on today's clock. A proposal that also moves the zone is flagged on its
      // card for that already; comparing hours across two zones is not what this check answers.
      const timeZone = profile.details.timeZone
      const impact = await checkImpact({
        before,
        after,
        services: profile.services.allIds.map((id) => profile.services.byId[id]).filter(Boolean),
        timeZone,
      })
      return hasImpact(impact) ? { impact, timeZone } : null
    },
    [checkImpact]
  )
}
