import { FC, HTMLAttributes, PropsWithChildren } from 'react'
import Link, { LinkProps } from 'next/link'
import { cn } from '@helpers/cn'

type Props = LinkProps & HTMLAttributes<HTMLAnchorElement>

const AppLink: FC<PropsWithChildren<Props>> = ({ children, className, ...props }) => {
  return (
    <Link
      {...props}
      className={cn(
        'text-brand underline decoration-brand/40 underline-offset-2 transition-colors hover:decoration-brand',
        className
      )}
    >
      {children}
    </Link>
  )
}

export default AppLink
