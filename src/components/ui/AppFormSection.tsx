import { FC, PropsWithChildren, ReactNode } from 'react'
import { cn } from '@helpers/cn'
import { AppText } from './bare/AppText'

export type AppFormSectionProps = PropsWithChildren<{
  title: ReactNode
  description?: ReactNode
  className?: string
}>

/**
 * Groups related form fields under a small heading. Kept antd-free so Server
 * Components can import it without pulling the client runtime.
 */
export const AppFormSection: FC<AppFormSectionProps> = ({ title, description, className, children }) => (
  <fieldset className={cn('flex flex-col gap-3 border-0 p-0 m-0', className)}>
    <legend className='float-left mb-1 w-full p-0'>
      <AppText size='body' tone='default' className='font-semibold'>
        {title}
      </AppText>
      {description && (
        <AppText size='body-sm' tone='muted' className='mt-0.5 block font-normal'>
          {description}
        </AppText>
      )}
    </legend>
    <div className='flex flex-col gap-3 clear-both'>{children}</div>
  </fieldset>
)
