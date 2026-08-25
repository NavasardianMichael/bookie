/**
 * Guards the assumptions the suite depends on. Runs before every test file.
 */

/**
 * `BookingSlot.start` is built as `dayjs(date).startOf('day').add(n, 'minute')` — a real
 * `Date` anchored in the *runtime's* timezone. Without a pinned zone these tests pass in
 * Yerevan and fail in CI, or vice versa, for reasons that look like logic bugs.
 *
 * `vitest.config.mts` sets `env.TZ`. This asserts it actually reached the worker rather
 * than being silently ignored, which is platform-dependent.
 */
const resolvedZone = Intl.DateTimeFormat().resolvedOptions().timeZone

if (process.env.TZ !== 'UTC' || (resolvedZone !== 'UTC' && resolvedZone !== 'Etc/UTC')) {
  throw new Error(
    `Timezone pin failed: process.env.TZ=${process.env.TZ ?? '<unset>'}, ` +
      `resolved=${resolvedZone}. Date-dependent assertions would be unreliable. ` +
      'Check `test.env.TZ` in vitest.config.mts.'
  )
}
