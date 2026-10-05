/**
 * iCalendar (RFC 5545) text for the provider's calendar feed and a client's single booking.
 * Hand-written rather than a dependency: two shapes of one VEVENT, and the rules that matter
 * are the three below. Imports nothing, so `tests/unit/server/ics.spec.ts` reaches it.
 *
 * - **Text is escaped** — `\`, `;`, `,` and newlines — or a client's note with a comma in it
 *   splits a field in two.
 * - **Lines are folded at 75 octets**, counted in UTF-8 bytes, never mid-character. A note in
 *   Armenian or Japanese is two or three bytes a character, and a calendar that receives an
 *   over-long line may drop the event.
 * - **Times are UTC (`…Z`).** The appointment is an instant; every calendar app renders it in
 *   its viewer's own zone, which is the point of subscribing.
 */

export type IcsEvent = {
  /** Stable across feed refreshes, so an edit moves the event instead of duplicating it. */
  uid: string
  start: Date
  end: Date
  summary: string
  description?: string
  location?: string
  url?: string
  /** `TENTATIVE` for a request still awaiting the provider's approval. */
  status?: 'CONFIRMED' | 'TENTATIVE'
  /** When this version of the event was produced. */
  stamp: Date
}

export type IcsCalendar = {
  /** Shown as the calendar's name when subscribed. */
  name?: string
  /** For a subscribed feed: how often the calendar app should poll, in minutes. */
  refreshMinutes?: number
  events: IcsEvent[]
}

const CRLF = '\r\n'
const MAX_OCTETS = 75

export const escapeIcsText = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r\n|\r|\n/g, '\\n')

/** `20261004T120000Z` */
export const formatIcsDate = (date: Date): string => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

/** Splits at 75 octets; each continuation starts with one space, which counts toward its 75. */
export const foldIcsLine = (line: string): string => {
  const encoder = new TextEncoder()
  if (encoder.encode(line).length <= MAX_OCTETS) return line

  const parts: string[] = []
  let current = ''
  let octets = 0
  let limit = MAX_OCTETS
  for (const char of line) {
    const size = encoder.encode(char).length
    if (octets + size > limit) {
      parts.push(current)
      current = ''
      octets = 0
      limit = MAX_OCTETS - 1
    }
    current += char
    octets += size
  }
  parts.push(current)
  return parts.join(`${CRLF} `)
}

const eventLines = (event: IcsEvent): string[] => [
  'BEGIN:VEVENT',
  `UID:${escapeIcsText(event.uid)}`,
  `DTSTAMP:${formatIcsDate(event.stamp)}`,
  `DTSTART:${formatIcsDate(event.start)}`,
  `DTEND:${formatIcsDate(event.end)}`,
  `SUMMARY:${escapeIcsText(event.summary)}`,
  ...(event.description ? [`DESCRIPTION:${escapeIcsText(event.description)}`] : []),
  ...(event.location ? [`LOCATION:${escapeIcsText(event.location)}`] : []),
  ...(event.url ? [`URL:${event.url}`] : []),
  `STATUS:${event.status ?? 'CONFIRMED'}`,
  'END:VEVENT',
]

export const buildIcsCalendar = (calendar: IcsCalendar): string =>
  [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Bookie//Bookings//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...(calendar.name ? [`X-WR-CALNAME:${escapeIcsText(calendar.name)}`] : []),
    ...(calendar.refreshMinutes
      ? [`REFRESH-INTERVAL;VALUE=DURATION:PT${calendar.refreshMinutes}M`, `X-PUBLISHED-TTL:PT${calendar.refreshMinutes}M`]
      : []),
    ...calendar.events.flatMap(eventLines),
    'END:VCALENDAR',
  ]
    .map(foldIcsLine)
    .join(CRLF) + CRLF
