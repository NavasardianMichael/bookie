import { FC, HTMLAttributes, PropsWithChildren } from 'react'
import { cn } from '@helpers/cn'

type Props = HTMLAttributes<HTMLHeadingElement> & {
  level?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
}

const AppTitle: FC<PropsWithChildren<Props>> = ({ level = 'h1', children, className, ...props }) => {
  const TitleTag = level
  return (
    <TitleTag className={cn('text-brand-text', className)} {...props}>
      {children}
    </TitleTag>
  )
}

export default AppTitle
