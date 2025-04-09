export const REGISTRATION_FORM_INITIAL_VALUES = {
  phoneNumber: '',
  countryCode: undefined, // Default to Armenia
  rememberMe: false,
} as const

export const REGISTRATION_TYPES = {
  phone: 'phone',
  google: 'google',
} as const

export const REGISTRATION_FORM_TEMPLATE = [
  {
    name: 'email',
    type: 'email',
    placeholder: 'Enter Email',
    autocomplete: 'username',
  },
  {
    name: 'password',
    type: 'password',
    placeholder: 'Enter Password',
    autocomplete: 'current-password',
  },
  {
    name: 'confirmedPassword',
    type: 'password',
    placeholder: 'Confirm Password',
    autocomplete: 'new-password',
  },
] as const

export const COUNTRY_CODES = [
  { code: '+374', country: 'Armenia', pattern: /^\+374[0-9]{8}$/, message: 'Armenian phone numbers must be 8 digits after +374' },
  { code: '+1', country: 'United States', pattern: /^\+1[0-9]{10}$/, message: 'US phone numbers must be 10 digits after +1' },
  { code: '+44', country: 'United Kingdom', pattern: /^\+44[0-9]{10}$/, message: 'UK phone numbers must be 10 digits after +44' },
  { code: '+33', country: 'France', pattern: /^\+33[0-9]{9}$/, message: 'French phone numbers must be 9 digits after +33' },
  { code: '+49', country: 'Germany', pattern: /^\+49[0-9]{10,11}$/, message: 'German phone numbers must be 10-11 digits after +49' },
  { code: '+7', country: 'Russia', pattern: /^\+7[0-9]{10}$/, message: 'Russian phone numbers must be 10 digits after +7' },
  { code: '+86', country: 'China', pattern: /^\+86[0-9]{11}$/, message: 'Chinese phone numbers must be 11 digits after +86' },
  { code: '+91', country: 'India', pattern: /^\+91[0-9]{10}$/, message: 'Indian phone numbers must be 10 digits after +91' },
  { code: '+81', country: 'Japan', pattern: /^\+81[0-9]{9,10}$/, message: 'Japanese phone numbers must be 9-10 digits after +81' },
  { code: '+82', country: 'South Korea', pattern: /^\+82[0-9]{9,10}$/, message: 'South Korean phone numbers must be 9-10 digits after +82' },
] as const
