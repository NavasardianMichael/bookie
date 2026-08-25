/** ISO 8601 duration — the form schema.org's `timeRequired` and `<time datetime>` expect. */
export const toIsoDuration = (minutes: number): string => `PT${minutes}M`

/** Human wording for the same value, so the visible label and the markup never drift apart. */
export const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes} min`

  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60

  return rest ? `${hours} h ${rest} min` : `${hours} h`
}
