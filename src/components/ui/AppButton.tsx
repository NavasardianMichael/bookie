import { FC, PropsWithChildren, Ref } from 'react'
import { Button, ButtonProps } from 'antd'
import { cn } from '@helpers/cn'

/**
 * `ref` is declared explicitly because antd's `ButtonProps` does not carry it — the real
 * `Button` is a `ForwardRefExoticComponent`, so its ref lives outside the props type. In
 * React 19 a ref is an ordinary prop, so spreading it through is enough; without the
 * declaration the wrapper merely fails to *type* it, which is what would make it
 * unusable as a `Dropdown` / `Tooltip` / `Popover` trigger — those clone the child and
 * need a handle on its DOM node to position the popup.
 */
export type AppButtonProps = ButtonProps & {
  ref?: Ref<HTMLAnchorElement | HTMLButtonElement>
}

export const AppButton: FC<PropsWithChildren<AppButtonProps>> = ({ className, ...props }) => {
  return <Button className={cn(className)} {...props} />
}
