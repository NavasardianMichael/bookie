import { useMemo } from 'react'
import { getCountries } from 'libphonenumber-js'
import { SIGN_ON_EXCLUDED_COUNTRIES } from '@constants/countries'
import Country from './components/Country'

export const useCountries = () => {
  const countries = useMemo(() => getCountries(), [])
  const countryOptions = useMemo(() => {
    return (
      countries
        // eslint-disable-next-line security/detect-object-injection
        .filter((country) => !SIGN_ON_EXCLUDED_COUNTRIES[country])
        .map((country) => ({
          value: country,
          label: <Country country={country} />,
        }))
    )
  }, [countries])

  return countryOptions
}
