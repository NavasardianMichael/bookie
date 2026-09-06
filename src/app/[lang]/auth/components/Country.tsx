import { FC } from 'react'
import Flag from 'react-world-flags'
import { Flex } from 'antd'
import { CountryCode, getCountryCallingCode } from 'libphonenumber-js'

type Props = {
  country: CountryCode
  /** Localized display name, shown as `+1 (United States)`. */
  name?: string
}

export const Country: FC<Props> = ({ country, name }) => {
  const code = `+${getCountryCallingCode(country)}`

  return (
    <Flex gap={2} align='center'>
      <Flag className='h-5 w-8 mr-2' code={country} />
      <span>
        {code}
        {name ? ` (${name})` : ''}
      </span>
    </Flex>
  )
}
