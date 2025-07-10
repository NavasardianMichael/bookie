import { CountryCode } from 'libphonenumber-js'
import { FC } from 'react'
import Flag from 'react-world-flags'

type Props = {
  country: CountryCode
}

const Country: FC<Props> = ({ country }) => {
  return (
    <Flag className='w-[24px]' code={country} />
    // <Flex gap={2} align="center">
    //   <span>
    //     {country} (+{getCountryCallingCode(country)})
    //   </span>
    // </Flex>
  )
}

export default Country
