import { FC, PropsWithChildren } from 'react'
import { Button, ButtonProps } from 'antd'
import { cn } from '@helpers/cn'

export type AppButtonProps = ButtonProps

export const AppButton: FC<PropsWithChildren<AppButtonProps>> = ({ className, ...props }) => {
  return <Button className={cn(className)} {...props} />
}
