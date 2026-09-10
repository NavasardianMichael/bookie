import { FC, PropsWithChildren } from 'react'
import { Input, InputProps } from 'antd'
import { cn } from '@helpers/cn'

/** `addonBefore` / `addonAfter` are deprecated in antd 6 — compose `Space.Compact` instead. */
type Props = Omit<InputProps, 'addonBefore' | 'addonAfter'>

export const AppInput: FC<PropsWithChildren<Props>> = ({ className, ...props }) => {
  return <Input className={cn(className)} {...props} />
}
