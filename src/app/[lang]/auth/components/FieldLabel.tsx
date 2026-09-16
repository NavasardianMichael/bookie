import { FC, ReactNode } from 'react'
import { cn } from '@helpers/cn'

export type FieldRequirement = 'Required' | 'Optional'

type Props = {
  htmlFor: string
  children: string
  /**
   * Required fields get a trailing `*`. Optional fields (and fields that omit
   * this) carry no mark.
   */
  requirement?: FieldRequirement
  /** Sits beside the title, outside the `<label>` so a control does not steal the click. */
  action?: ReactNode
  className?: string
}

/**
 * The label row above a form field.
 *
 * Deliberately a real `<label htmlFor>` rather than antd's `Form.Item label`: antd renders
 * its label inside an `inline-flex` element sized to its content, so a trailing mark
 * cannot be laid out against the input's edge without overriding antd's own unlayered CSS
 * — and unlayered beats Tailwind's `@layer utilities`, which would leave only a `!` suffix
 * as the escape hatch. That is a grep gate (`src/styles/CLAUDE.md`). Owning the label
 * sidesteps the whole problem and keeps the association explicit.
 */
export const FieldLabel: FC<Props> = ({ htmlFor, children, requirement, className, action }) => {
  const requiredMark =
    requirement === 'Required' ? (
      <span className='text-brand-danger ms-0.5 font-normal' aria-hidden='true'>
        *
      </span>
    ) : null

  if (!action) {
    return (
      <label htmlFor={htmlFor} className={cn('text-brand-text text-body-sm font-bold', className)}>
        {children}
        {requiredMark}
      </label>
    )
  }

  return (
    <div className={cn('flex items-center gap-4', className)}>
      <span className='flex min-w-0 items-center gap-0.5'>
        <label htmlFor={htmlFor} className='text-brand-text text-body-sm font-bold'>
          {children}
          {requiredMark}
        </label>
        {action}
      </span>
    </div>
  )
}
