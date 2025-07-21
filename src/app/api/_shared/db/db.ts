import { appointments } from './appointments'
import { categories } from './categories'
import { consumers } from './consumers'
import { DBType } from './db.types'
import { organizations } from './organizations'
import { providers } from './providers'

export const DB: DBType = {
  categories,
  consumers,
  providers,
  organizations,
  appointments,
  getCodeByPhoneNumber: true,
  validatePhoneNumberCode: true,
}
