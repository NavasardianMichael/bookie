import { describe, expect, it } from 'vitest'
import { type BookingFacts, newBookingNotice, reminderForBookerNotice } from '../../../server/src/lib/booking-notices'
import { renderNoticeEmail, renderNoticeTelegram } from '../../../server/src/lib/notice-render'

const FACTS: BookingFacts = {
  bookerName: 'Gor <img src=x onerror=alert(1)>',
  bookerFirstName: 'Gor',
  providerName: 'Anna & Co',
  providerFirstName: 'Anna',
  serviceName: 'Cut <b>&</b> colour',
  when: 'Monday, 5 October 2026 at 10:00 GMT+4',
}

describe('renderNoticeTelegram', () => {
  // Names are written by people; Telegram's HTML mode would render a tag in one as markup.
  it('escapes every user-authored string and keeps our own markup', () => {
    const html = renderNoticeTelegram(newBookingNotice(FACTS, 'https://bookie.example/en/bookings'))
    expect(html).toContain('<b>New booking: Cut &lt;b&gt;&amp;&lt;/b&gt; colour</b>')
    expect(html).toContain('Gor &lt;img src=x onerror=alert(1)&gt;')
    expect(html).not.toContain('<img')
    expect(html).toContain('<a href="https://bookie.example/en/bookings">See your bookings</a>')
  })

  it('puts the time in bold, the one line the reader is looking for', () => {
    expect(renderNoticeTelegram(newBookingNotice(FACTS, 'https://x/en/bookings'))).toContain(`<b>${FACTS.when}</b>`)
  })
})

describe('renderNoticeEmail', () => {
  it('renders the same notice as text and as escaped HTML', () => {
    const email = renderNoticeEmail(reminderForBookerNotice(FACTS, 'https://bookie.example/en/b/own.1.abc'))
    expect(email.subject).toBe('Reminder: your Cut <b>&</b> colour appointment')
    expect(email.text).toContain('Hi Gor,')
    expect(email.text).toContain('https://bookie.example/en/b/own.1.abc')
    expect(email.html).toContain('Anna &amp; Co')
    expect(email.html).not.toContain('<b>&</b>')
  })
})
