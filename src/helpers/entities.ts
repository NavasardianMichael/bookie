import { AppRouteName } from '@interfaces/routes'

export const generateEntityUrl = (entityName: AppRouteName, entityId: string) => {
  return `${process.env.NEXT_PUBLIC_API_URL}${entityName}/${entityId}`
}
