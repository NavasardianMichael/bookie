import { escapeHtml } from './mail.js'

/**
 * One notification, written once and rendered for each channel it goes out on — email (text
 * and HTML) and Telegram (its HTML subset). Before Telegram, every email hand-wrote its text
 * and HTML twice; a third hand-written copy per message is how the channels would drift.
 *
 * Every string here is **plain text**, escaped on the way out — a provider's or client's
 * name can reach any of them. Only `link.url` is trusted, and only because every caller
 * builds it from our own origin and a fixed path (`lib/return-path.ts`).
 */
export type Notice = {
  /** The email subject; the bold first line on Telegram. */
  subject: string
  /** "Hi Anna," — email only; a Telegram message is already addressed to its reader. */
  greeting: string
  /** Paragraphs in order; `{ strong }` is the one line the reader is looking for (the time). */
  paragraphs: (string | { strong: string })[]
  link?: { url: string; label: string }
}

const paragraphText = (paragraph: Notice['paragraphs'][number]): string =>
  typeof paragraph === 'string' ? paragraph : paragraph.strong

export const renderNoticeEmail = (notice: Notice): { subject: string; text: string; html: string } => ({
  subject: notice.subject,
  text:
    [notice.greeting, ...notice.paragraphs.map(paragraphText)].join('\n\n') +
    (notice.link ? `\n\n${notice.link.label}:\n\n${notice.link.url}\n` : '\n'),
  html:
    `<p>${escapeHtml(notice.greeting)}</p>${ 
    notice.paragraphs
      .map((paragraph) =>
        typeof paragraph === 'string'
          ? `<p>${escapeHtml(paragraph)}</p>`
          : `<p><strong>${escapeHtml(paragraph.strong)}</strong></p>`
      )
      .join('') 
    }${notice.link ? `<p><a href="${notice.link.url}">${escapeHtml(notice.link.label)}</a></p>` : ''}`,
})

/**
 * Telegram's `parse_mode: 'HTML'` accepts `<b>` and `<a href>` and requires `&`, `<` and `>`
 * escaped everywhere else — which `escapeHtml` does (it also escapes quotes, which Telegram
 * decodes as entities).
 */
export const renderNoticeTelegram = (notice: Notice): string =>
  [
    `<b>${escapeHtml(notice.subject)}</b>`,
    ...notice.paragraphs.map((paragraph) =>
      typeof paragraph === 'string' ? escapeHtml(paragraph) : `<b>${escapeHtml(paragraph.strong)}</b>`
    ),
    ...(notice.link ? [`<a href="${notice.link.url}">${escapeHtml(notice.link.label)}</a>`] : []),
  ].join('\n\n')
