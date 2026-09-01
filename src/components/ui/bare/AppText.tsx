import { FC, HTMLAttributes, PropsWithChildren } from 'react'
import { cn } from '@helpers/cn'
import { TEXT_SIZES, TEXT_TONES, TextSize, TextTone } from './typography'

export type AppTextTag = 'span' | 'strong' | 'em' | 'small' | 'b'

type Props = HTMLAttributes<HTMLElement> & {
  as?: AppTextTag
  /** Left unset the text inherits its container's step, which is what inline copy usually wants. */
  size?: TextSize
  tone?: TextTone
  /** Tabular figures. Use for times, durations and prices. */
  numeric?: boolean
}

/**
 * Inline text on the app scale, replacing raw `Typography.Text` — which is antd,
 * therefore a client component, therefore text that only reaches the HTML through
 * hydration.
 */
export const AppText: FC<PropsWithChildren<Props>> = ({
  as: Tag = 'span',
  size,
  tone,
  numeric,
  children,
  className,
  ...props
}) => (
  <Tag className={cn(size && TEXT_SIZES[size], tone && TEXT_TONES[tone], numeric && 'tnum', className)} {...props}>
    {children}
  </Tag>
)
