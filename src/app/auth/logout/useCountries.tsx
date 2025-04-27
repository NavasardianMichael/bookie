import { getCountries } from 'libphonenumber-js';
import { useMemo } from 'react';
import Country from './components/Country';

export const useCountries = () => {
    const countries = useMemo(() => getCountries(), []);
    const countryOptions = useMemo(() =>
        countries.map(country => ({
            value: country,
            label: (
                <Country country={country} />
            )
        })), [countries]);

    return countryOptions
}
