import { FC } from 'react'
import { cn } from '@helpers/cn'

export type FieldRequirement = 'Required' | 'Optional'

type Props = {
  htmlFor: string
  children: string
  /**
   * The consumer registration screen states requirement as a word rather than an asterisk,
   * right-aligned in the label row. Omit where the design uses no badge — the provider
   * screen bakes "(Mandatory)" into the label text instead.
   */
  requirement?: FieldRequirement
  /**
   * Overrides the badge's text while `requirement` still decides its tone. The
   * registration screens are hardcoded English and pass nothing; a translated screen
   * passes the localised word, since `FieldRequirement` is an English literal union
   * doing double duty as the semantic flag.
   */
  requirementText?: string
  className?: string
}

/**
 * The label row above a registration field.
 *
 * Deliberately a real `<label htmlFor>` rather than antd's `Form.Item label`: antd renders
 * its label inside an `inline-flex` element sized to its content, so a right-aligned badge
 * cannot be pushed to the input's far edge without overriding antd's own unlayered CSS —
 * and unlayered beats Tailwind's `@layer utilities`, which would leave only a `!` suffix as
 * the escape hatch. That is a grep gate (`src/styles/CLAUDE.md`). Owning the label sidesteps
 * the whole problem and keeps the association explicit.
 */
export const FieldLabel: FC<Props> = ({ htmlFor, children, requirement, requirementText, className }) => (
  <label
    htmlFor={htmlFor}
    className={cn('text-brand-text text-body-sm flex items-baseline justify-between gap-4 font-bold', className)}
  >
    <span>{children}</span>
    {requirement && (
      <span
        className={cn('text-caption font-normal', requirement === 'Required' ? 'text-brand/60' : 'text-brand-muted')}
      >
        {requirementText ?? requirement}
      </span>
    )}
  </label>
)
