import { FC } from 'react'
import { Input } from 'antd'
import type { TextAreaProps } from 'antd/es/input'
import { cn } from '@helpers/cn'

/**
 * Form textareas stay a fixed box. antd's own style is `resize: vertical` and
 * it is unlayered, so a Tailwind `resize-none` on `className` loses.
 */
export const AppTextArea: FC<TextAreaProps> = ({ className, styles, ...props }) => {
  const styleMap = typeof styles === 'function' ? undefined : styles

  return (
    <Input.TextArea
      className={cn(className)}
      styles={{ ...styleMap, textarea: { resize: 'none', ...styleMap?.textarea } }}
      {...props}
    />
  )
}
