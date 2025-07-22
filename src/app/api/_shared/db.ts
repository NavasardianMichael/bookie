import { appointments } from './db/appointments'
import { categories } from './db/categories'
import { consumers } from './db/consumers'
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
