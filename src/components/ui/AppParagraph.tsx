import { FC, HTMLAttributes, PropsWithChildren } from 'react'
import { combineClassNames } from '@helpers/commons'

type Props = HTMLAttributes<HTMLParagraphElement>

const AppParagraph: FC<PropsWithChildren<Props>> = ({ children,className, ...props }) => {
  return (
    <p className={combineClassNames('text-bookie-blue', className)} {...props}>
      {children}
    </p>
  )
}

export default AppParagraph
