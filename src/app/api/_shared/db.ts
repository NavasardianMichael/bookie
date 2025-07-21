import { appointments } from './appointments'
import { categories } from './categories'
import { consumers } from './consumers'
import { DBType } from './db/db.types'
import { organizations } from './db/organizations'
import { providers } from './db/providers'

export const DB: DBType = {
  consumers,
  providers,
  organizations,
  categories,
  appointments,
  getCodeByPhoneNumber: true,
  validatePhoneNumberCode: true,
}
