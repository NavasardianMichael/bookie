declare module 'react-world-flags' {
  import { FC } from 'react'

  interface FlagProps {
    code: string
    height?: string | number
    width?: string | number
    className?: string
    style?: React.CSSProperties
  }

  const Flag: FC<FlagProps>
  export default Flag
}
