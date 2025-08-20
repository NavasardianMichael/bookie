import { Normalized } from '@interfaces/commons'

export const combineClassNames = (...classNames: ReadonlyArray<string | undefined | boolean>) => {
  return classNames.filter((className) => !!className).join(' ')
}

export const pick = <T extends object, K extends keyof T>(obj: T, keys: K[]) =>
  Object.fromEntries(keys.filter((key) => key in obj).map((key) => [key, obj[key!]])) as Pick<T, K>

export const omit = <T extends object, K extends keyof T>(obj: T, keys: K[]) =>
  Object.fromEntries(Object.entries(obj).filter(([key]) => !keys.includes(key as K))) as Omit<T, K>

export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const normalizedToFlat = <T extends { id: string }>(data: Normalized<T>): T[] => {
  return data.allIds.map((itemId) => data.byId[itemId])
}

export const flatToNormalized = <T extends { id: string }>(data: T[]): Normalized<T> => {
  return data.reduce(
    (acc, item) => {
      if (!item.id) return acc
      acc.byId[item.id as T['id']] = item
      acc.allIds.push(item.id)
      return acc
    },
    {
      allIds: [] as Normalized<T>['allIds'],
      byId: {} as Normalized<T>['byId'],
    }
  )
}
