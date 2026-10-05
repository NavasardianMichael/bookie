/**
 * Who gets a notification, and on which channel — the one place that decides
 * (docs/NOTIFICATIONS.md). Notifications go by **email and Telegram only**; there is no SMS.
 *
 * | Kind | Preference that silences it |
 * |---|---|
 * | `newBooking` | `newBooking` (providers only) |
 * | `bookingChanges` | `bookingChanges` — a reschedule or cancellation by the other side |
 * | `reminder` | `appointmentReminders` |
 * | `always` | none — the approval request, and the answer to one, are what move a booking on |
 *
 * A preference silences the event on **both** channels. Email goes wherever there is an
 * address; Telegram where a chat is linked *and* `telegramAllowed` — always for a client
 * (clients never pay), and for a provider only when their plan has `telegramNotifications`.
 */
export type NoticeKind = 'newBooking' | 'bookingChanges' | 'reminder' | 'always'

/** The merged `emailNotificationPrefs` of either profile. A client has no `newBooking`. */
export type NoticePrefs = {
  appointmentReminders: boolean
  bookingChanges: boolean
  newBooking?: boolean
}

export type Recipient = {
  email?: string
  telegramChatId?: string | null
  prefs: NoticePrefs
  telegramAllowed: boolean
}

export const prefersNotice = (kind: NoticeKind, prefs: NoticePrefs): boolean => {
  switch (kind) {
    case 'always':
      return true
    case 'reminder':
      return prefs.appointmentReminders
    case 'bookingChanges':
      return prefs.bookingChanges
    case 'newBooking':
      return prefs.newBooking !== false
  }
}

export const channelsFor = (kind: NoticeKind, recipient: Recipient): { email: boolean; telegram: boolean } => {
  const wanted = prefersNotice(kind, recipient.prefs)
  return {
    email: wanted && Boolean(recipient.email),
    telegram: wanted && recipient.telegramAllowed && Boolean(recipient.telegramChatId),
  }
}
