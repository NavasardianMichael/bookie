import { useMemo } from 'react'
import { getCountries, getCountryCallingCode } from 'libphonenumber-js'
import { useLocale } from 'next-intl'
import { SIGN_ON_EXCLUDED_COUNTRIES } from '@constants/countries'
import { getCountryName } from '@helpers/country'
import { Country } from './Country'

export const useCountries = () => {
  const locale = useLocale()
  const countries = useMemo(() => getCountries(), [])
  const countryOptions = useMemo(() => {
    return countries
      .filter((country) => !SIGN_ON_EXCLUDED_COUNTRIES[country])
      .map((country) => {
        const name = getCountryName(country, locale)
        return {
          value: country,
          label: <Country country={country} name={name} />,
          // React-node `label` is not searchable; this is what `optionFilterProp` reads.
          searchLabel: `+${getCountryCallingCode(country)} ${name ?? ''} ${country}`,
        }
      })
  }, [countries, locale])

  return countryOptions
}
