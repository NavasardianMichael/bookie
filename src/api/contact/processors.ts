import { PostContactMessageAPI } from './types'

/**
 * The route answers `{ value: true }` and the form has nothing to render from it — a
 * failure arrives as an axios rejection, not as a `false`. So this discards the envelope
 * deliberately rather than for lack of anything to unwrap.
 */
export const processPostContactMessageResponse: PostContactMessageAPI['processor'] = () => undefined
