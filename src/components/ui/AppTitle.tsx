import { FC, HTMLAttributes, PropsWithChildren } from 'react'
import { combineClassNames } from '@helpers/commons'

type Props = HTMLAttributes<HTMLHeadingElement> & {
  level?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
}

const AppTitle: FC<PropsWithChildren<Props>> = ({ level = 'h1', children,className, ...props }) => {
  const TitleTag = level
  return (
    <TitleTag className={combineClassNames('text-bookie-blue', className)} {...props}>
      {children}
    </TitleTag>
  )
}

export default AppTitle
