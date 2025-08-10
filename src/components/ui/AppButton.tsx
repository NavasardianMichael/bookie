import { FC, PropsWithChildren, useMemo } from 'react'
import { Button, ButtonProps } from 'antd'
import { combineClassNames } from '@helpers/commons'

type Props = ButtonProps

const AppButton: FC<PropsWithChildren<Props>> = ({ className, ...props }) => {
  const combinedClassName = useMemo(() => {
    return combineClassNames(className)
  }, [className])

  return <Button size='large' className={combinedClassName} {...props} />
}

export default AppButton
