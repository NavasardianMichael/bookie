import { FC, PropsWithChildren } from 'react'
import { Input, InputProps } from 'antd'
import { cn } from '@helpers/cn'

type Props = InputProps

const AppInput: FC<PropsWithChildren<Props>> = ({ className, ...props }) => {
  return <Input size='large' className={cn(className)} {...props} />
}

export default AppInput
