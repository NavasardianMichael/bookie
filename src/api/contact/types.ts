import { Endpoint } from '@interfaces/api'

/**
 * There is no `Contact` entity and no store slice for this domain — the page writes and
 * never reads, and nothing is persisted server-side. So the payload type lives here
 * rather than in `src/store/`, the same way `PutConsumerProfileRequestPayload` does.
 */
export type PostContactMessageRequestPayload = {
  firstName: string
  lastName: string
  /** Optional: a signed-in visitor may have no address on file, and the field allows blank. */
  email?: string
  message: string
  /**
   * Honeypot. Always sent, always empty for a person — the server drops any submission
   * that has it filled in. Sent as `''` rather than omitted so its absence cannot become
   * the tell a bot looks for.
   */
  website?: string
}

export type PostContactMessageAPI = Endpoint<{
  payload: PostContactMessageRequestPayload
  response: boolean
  processed: void
}>
