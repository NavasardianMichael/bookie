import { describe, expect, it } from 'vitest'
import { buildIcsCalendar, escapeIcsText, foldIcsLine, formatIcsDate } from '../../../server/src/lib/ics'

const octets = (line: string): number => new TextEncoder().encode(line).length

describe('escapeIcsText', () => {
  // A comma or semicolon left bare splits a field; a raw newline ends the property.
  it('escapes the characters iCalendar gives meaning to', () => {
    expect(escapeIcsText('Cut, colour; wash\nThanks \\ see you')).toBe('Cut\\, colour\\; wash\\nThanks \\\\ see you')
  })
})

describe('formatIcsDate', () => {
  it('writes an instant in UTC basic format', () => {
    expect(formatIcsDate(new Date('2026-10-04T09:30:00.000Z'))).toBe('20261004T093000Z')
  })
})

describe('foldIcsLine', () => {
  it('leaves a short line alone', () => {
    expect(foldIcsLine('SUMMARY:Haircut')).toBe('SUMMARY:Haircut')
  })

  it('folds at 75 octets, continuing each line with a space', () => {
    const folded = foldIcsLine(`DESCRIPTION:${'a'.repeat(200)}`)
    const lines = folded.split('\r\n')
    expect(lines.length).toBeGreaterThan(2)
    lines.forEach((line, index) => {
      expect(octets(line)).toBeLessThanOrEqual(75)
      if (index > 0) expect(line.startsWith(' ')).toBe(true)
    })
    expect(lines.map((line, index) => (index ? line.slice(1) : line)).join('')).toBe(`DESCRIPTION:${'a'.repeat(200)}`)
  })

  // Counted in bytes, and never through the middle of a character.
  it('never splits a multi-byte character', () => {
    const text = `SUMMARY:${'Ամրագրում '.repeat(12)}`
    const lines = foldIcsLine(text).split('\r\n')
    lines.forEach((line) => expect(octets(line)).toBeLessThanOrEqual(75))
    expect(lines.map((line, index) => (index ? line.slice(1) : line)).join('')).toBe(text)
  })
})

describe('buildIcsCalendar', () => {
  const ics = buildIcsCalendar({
    name: 'Bookie — Anna',
    refreshMinutes: 60,
    events: [
      {
        uid: 'appt-1@bookie',
        start: new Date('2026-10-04T09:00:00.000Z'),
        end: new Date('2026-10-04T10:00:00.000Z'),
        summary: 'Haircut — Gor, Petrosyan',
        status: 'TENTATIVE',
        stamp: new Date('2026-10-01T00:00:00.000Z'),
      },
    ],
  })

  it('is a CRLF-delimited calendar with one event', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true)
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1)
  })

  it('writes the event in UTC with its status and escaped summary', () => {
    expect(ics).toContain('DTSTART:20261004T090000Z\r\n')
    expect(ics).toContain('DTEND:20261004T100000Z\r\n')
    expect(ics).toContain('STATUS:TENTATIVE\r\n')
    expect(ics).toContain('SUMMARY:Haircut — Gor\\, Petrosyan\r\n')
  })

  it('tells a subscribed calendar how often to refresh', () => {
    expect(ics).toContain('REFRESH-INTERVAL;VALUE=DURATION:PT60M\r\n')
  })
})
