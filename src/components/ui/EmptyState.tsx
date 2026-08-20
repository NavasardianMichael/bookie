import { FC, ReactNode } from 'react'
import { cn } from '@helpers/cn'
import { InboxIcon } from './icons'

export type EmptyStateProps = {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  icon?: ReactNode
  className?: string
}

/**
 * Replaces the silently-blank regions the app renders today when a list is empty.
 */
const EmptyState: FC<EmptyStateProps> = ({ title, description, action, icon, className }) => (
  <div
    className={cn(
      'border-brand-border bg-surface-sunken flex flex-col items-center gap-3 rounded-brand border border-dashed px-6 py-12 text-center',
      className
    )}
  >
    <span className='text-brand-300' aria-hidden='true'>
      {icon ?? <InboxIcon />}
    </span>
    <div className='flex flex-col gap-1'>
      <p className='text-h3 text-brand-text'>{title}</p>
      {description && <p className='text-body-sm max-w-prose-content'>{description}</p>}
    </div>
    {action && <div className='mt-2'>{action}</div>}
  </div>
)

export default EmptyState
