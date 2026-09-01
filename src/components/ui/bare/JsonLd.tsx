import { FC } from 'react'
import { serializeJsonLd } from '@helpers/jsonLd'

type Props = {
  data: object
}

/**
 * Structured data has to reach the document as raw text, which makes this the one
 * place in the app that needs `dangerouslySetInnerHTML`. Centralising it means the
 * escaping happens once, in `serializeJsonLd`, instead of being re-derived at each
 * page that emits a graph.
 */
export const JsonLd: FC<Props> = ({ data }) => (
  <script type='application/ld+json' dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />
)
