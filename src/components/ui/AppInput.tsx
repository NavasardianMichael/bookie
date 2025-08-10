import { FC, PropsWithChildren, useMemo } from 'react'
import { Input, InputProps } from 'antd'
import { combineClassNames } from '@helpers/commons'

type Props = InputProps

const AppInput: FC<PropsWithChildren<Props>> = ({ className, ...props }) => {
  const combinedClassName = useMemo(() => {
    return combineClassNames('bg-transparent!', className)
  }, [className])

  return <Input size='large' className={combinedClassName} {...props} />
}

export default AppInput
