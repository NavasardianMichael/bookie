import { DBType } from './db.types'
import { organizations } from './organizations'
import { providers } from './providers'
import { organizationToBasic, providerToBasic } from '../helpers/processors'

export const categories: DBType['categories'] = [
  {
    id: 'cat-1',
    name: 'General Medicine',
    organizations: organizations.slice(0, 2).map((organization) => organizationToBasic(organization)),
    providers: providers.slice(0, 2).map((provider) => providerToBasic(provider)),
  },
  { id: 'cat-2', name: 'Physical Therapy', organizations: [], providers: [] },
  { id: 'cat-3', name: 'Mental Health', organizations: [], providers: [] },
  { id: 'cat-4', name: 'Dentistry', organizations: [], providers: [] },
  { id: 'cat-5', name: 'Cardiology', organizations: [], providers: [] },
  { id: 'cat-6', name: 'Dermatology', organizations: [], providers: [] },
  { id: 'cat-7', name: 'Pediatrics', organizations: [], providers: [] },
  { id: 'cat-8', name: 'Emergency Medicine', organizations: [], providers: [] },
  { id: 'cat-9', name: 'Ophthalmology', organizations: [], providers: [] },
  { id: 'cat-10', name: 'Orthopedics', organizations: [], providers: [] },
  { id: 'cat-11', name: 'Neurology', organizations: [], providers: [] },
  { id: 'cat-12', name: 'Gastroenterology', organizations: [], providers: [] },
  { id: 'cat-13', name: 'Gynecology', organizations: [], providers: [] },
  { id: 'cat-14', name: 'Oncology', organizations: [], providers: [] },
  { id: 'cat-15', name: 'Pulmonology', organizations: [], providers: [] },
]
