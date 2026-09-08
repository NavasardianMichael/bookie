import { FC } from 'react'
import { Input } from 'antd'
import type { TextAreaProps } from 'antd/es/input'
import { cn } from '@helpers/cn'

const formatCount = ({ count, maxLength }: { count: number; maxLength?: number }) =>
  typeof maxLength === 'number' ? `${count}/${maxLength}` : `${count}`

/**
 * Form textareas stay a fixed box. antd's own style is `resize: vertical` and
 * it is unlayered, so a Tailwind `resize-none` on `className` loses.
 *
 * Pass `maxLength` (or `count.max`) when the field has a cap — the used/max
 * crumb (`12/300`) is then shown automatically. Do not wrap this in a layout
 * element inside `Form.Item`, or antd lands `value`/`onChange` on the wrapper.
 */
export const AppTextArea: FC<TextAreaProps> = ({
  className,
  classNames,
  styles,
  maxLength,
  count,
  showCount,
  ...props
}) => {
  const styleMap = typeof styles === 'function' ? undefined : styles
  const classMap = typeof classNames === 'function' ? undefined : classNames
  const limit = count?.max ?? maxLength
  const mergedCount =
    count ??
    (typeof limit === 'number' && showCount !== false
      ? {
          max: limit,
          show: formatCount,
        }
      : undefined)

  return (
    <Input.TextArea
      className={cn(className)}
      classNames={{ ...classMap, count: cn('text-caption text-brand-muted tnum', classMap?.count) }}
      maxLength={maxLength}
      count={mergedCount}
      showCount={showCount}
      styles={{ ...styleMap, textarea: { resize: 'none', ...styleMap?.textarea } }}
      {...props}
    />
  )
}
