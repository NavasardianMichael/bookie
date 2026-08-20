import { FC, HTMLAttributes, PropsWithChildren } from 'react'
import { cn } from '@helpers/cn'

type Props = HTMLAttributes<HTMLParagraphElement>

const AppParagraph: FC<PropsWithChildren<Props>> = ({ children, className, ...props }) => {
  return (
    <p className={cn('text-brand-muted', className)} {...props}>
      {children}
    </p>
  )
}

export default AppParagraph
