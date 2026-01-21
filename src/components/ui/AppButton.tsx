import { FC, PropsWithChildren } from 'react'
import { Button, ButtonProps } from 'antd'

type Props = ButtonProps

const AppButton: FC<PropsWithChildren<Props>> = ({ className, ...props }) => {
  return <Button size='large' className={className} {...props} />
}

export default AppButton
