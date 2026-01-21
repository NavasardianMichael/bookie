import { FC, HTMLAttributes, PropsWithChildren } from 'react'

type Props = HTMLAttributes<HTMLDivElement>

const AppBox: FC<PropsWithChildren<Props>> = ({ children, ...props }) => {
  return (
    <div  {...props}>
      {children}
    </div>
  )
}

export default AppBox
