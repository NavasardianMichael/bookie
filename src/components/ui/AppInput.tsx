import { FC, PropsWithChildren } from 'react'
import { Input, InputProps } from 'antd'
import { cn } from '@helpers/cn'

type Props = InputProps

export const AppInput: FC<PropsWithChildren<Props>> = ({ className, ...props }) => {
  return <Input className={cn(className)} {...props} />
}
