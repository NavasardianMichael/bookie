import { FC } from 'react'
import { cn } from '@helpers/cn'
import { ErrorDetails as ErrorDetailsData, formatErrorDetails } from '@helpers/error'

export type ErrorDetailsProps = {
  details: ErrorDetailsData
  /** `Errors.devDetails`, passed in so this stays usable where no translator is mounted. */
  label: string
  className?: string
}

/**
 * The original error, collapsed under the friendly copy. Rendered only in development —
 * callers get `details` from `useErrorMessage`, which leaves it undefined in production.
 */
export const ErrorDetails: FC<ErrorDetailsProps> = ({ details, label, className }) => (
  <details className={cn('text-caption text-brand-muted', className)}>
    <summary className='cursor-pointer select-none'>{label}</summary>
    <pre className='bg-brand-50 mt-2 max-h-60 overflow-auto whitespace-pre-wrap wrap-break-word rounded-brand-sm p-2 text-start'>
      {formatErrorDetails(details)}
    </pre>
  </details>
)
