import { FC } from 'react'
import Flag from 'react-world-flags'
import { Flex } from 'antd'
import { CountryCode, getCountryCallingCode } from 'libphonenumber-js'

type Props = {
  country: CountryCode
}

const Country: FC<Props> = ({ country }) => {
  console.log({ country })

  return (
    <Flex gap={2} align='center'>
      <Flag className='h-5 w-8 mr-2' code={country} />
      <span>+{getCountryCallingCode(country)}</span>
    </Flex>
  )
}

export default Country
