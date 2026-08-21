import { FC, PropsWithChildren, ReactNode } from 'react'
import { cn } from '@helpers/cn'

export type AppFormSectionProps = PropsWithChildren<{
  title: ReactNode
  description?: ReactNode
  className?: string
}>

/**
 * Groups related form fields under a small heading. Kept antd-free so Server
 * Components can import it without pulling the client runtime.
 */
const AppFormSection: FC<AppFormSectionProps> = ({ title, description, className, children }) => (
  <fieldset className={cn('flex flex-col gap-3 border-0 p-0 m-0', className)}>
    <legend className='float-left mb-1 w-full p-0'>
      <span className='text-body font-semibold text-brand-text'>{title}</span>
      {description && <span className='text-body-sm mt-0.5 block font-normal'>{description}</span>}
    </legend>
    <div className='flex flex-col gap-3 clear-both'>{children}</div>
  </fieldset>
)

export default AppFormSection
