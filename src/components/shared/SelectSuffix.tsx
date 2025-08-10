import { JSX } from 'react'
import { DownOutlined } from '@ant-design/icons'

type Props = {
  value: number
  limit: number
  Icon?: JSX.Element
}

const SelectSuffix: React.FC<Props> = ({ value, limit, Icon = <DownOutlined /> }) => {
  return (
    <>
      <span>
        {value} / {limit}
      </span>
      {Icon}
    </>
  )
}

export default SelectSuffix
