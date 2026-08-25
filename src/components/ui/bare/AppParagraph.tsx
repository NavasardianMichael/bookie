import { FC, HTMLAttributes, PropsWithChildren } from 'react'
import { cn } from '@helpers/cn'
import { TEXT_SIZES, TEXT_TONES, TextSize, TextTone } from './typography'

type Props = HTMLAttributes<HTMLParagraphElement> & {
  size?: TextSize
  tone?: TextTone
}

/** Bare `<p>` on the app type scale. Body copy defaults to the muted tone so headings keep their weight. */
const AppParagraph: FC<PropsWithChildren<Props>> = ({
  size = 'body',
  tone = 'muted',
  children,
  className,
  ...props
}) => (
  <p className={cn(TEXT_SIZES[size], TEXT_TONES[tone], className)} {...props}>
    {children}
  </p>
)

export default AppParagraph
