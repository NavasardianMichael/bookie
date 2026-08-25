import { FC, PropsWithChildren } from 'react'
import { Button, ButtonProps } from 'antd'
import { cn } from '@helpers/cn'

type Props = ButtonProps

const AppButton: FC<PropsWithChildren<Props>> = ({ className, ...props }) => {
  return <Button size='large' className={cn(className)} {...props} />
}

export default AppButton
