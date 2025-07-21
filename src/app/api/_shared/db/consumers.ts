import { DBType } from './db.types'
import { providers } from './providers'
import { providerToBasic } from '../helpers/processors'

export const consumers: DBType['consumers'] = [
  {
    id: '1',
    basic: {
      name: 'Alice Johnson',
      phoneNumber: '+1234567890',
    },
    details: {
      favoriteProviders: providers.slice(0, 2).map((provider) => providerToBasic(provider)),
    },
  },
  {
    id: '2',
    basic: {
      name: 'Bob Smith',
      phoneNumber: '+1234567891',
    },
    details: {
      favoriteProviders: [
        {
          id: '2',
          basic: {
            categories: [{ id: 'cat-2', name: 'Physical Therapy', organizations: [], providers: [] }],
            firstName: 'Jane',
            lastName: 'Smith',
            image: 'https://randomuser.me/api/portraits/women/2.jpg',
          },
        },
      ],
    },
  },
  {
    id: '3',
    basic: {
      name: 'Carol Williams',
      phoneNumber: '+1234567892',
    },
    details: {
      favoriteProviders: [],
    },
  },
  {
    id: '4',
    basic: {
      name: 'David Brown',
      phoneNumber: '+1234567893',
    },
    details: {
      favoriteProviders: [
        {
          id: '4',
          basic: {
            categories: [{ id: 'cat-4', name: 'Dentistry', organizations: [], providers: [] }],
            firstName: 'Bob',
            lastName: 'Williams',
            image: 'https://randomuser.me/api/portraits/men/4.jpg',
          },
        },
        {
          id: '5',
          basic: {
            categories: [{ id: 'cat-5', name: 'Cardiology', organizations: [], providers: [] }],
            firstName: 'Carol',
            lastName: 'Brown',
            image: 'https://randomuser.me/api/portraits/women/5.jpg',
          },
        },
      ],
    },
  },
]
