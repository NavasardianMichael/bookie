import { Flex } from "antd";
import { CountryCode, getCountryCallingCode } from 'libphonenumber-js';
import { FC } from 'react';
import Flag from 'react-world-flags';

type Props = {
    country: CountryCode
}

const Country: FC<Props> = ({ country }) => {
    return (
        <Flex gap={2} align='center'>
            <Flag className="h-5 w-8" code={country} />
            <span>{country} (+{getCountryCallingCode(country)})</span>
        </Flex>
    )
}

export default Country;