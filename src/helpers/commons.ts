import { Normalized } from '@interfaces/commons'

export const pick = <T extends object, K extends keyof T>(obj: T, keys: K[]) =>
  Object.fromEntries(keys.filter((key) => key in obj).map((key) => [key, obj[key!]])) as Pick<T, K>

export const omit = <T extends object, K extends keyof T>(obj: T, keys: K[]) =>
  Object.fromEntries(Object.entries(obj).filter(([key]) => !keys.includes(key as K))) as Omit<T, K>

export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * `allIds` order, resolved through `byId`.
 *
 * Entries with no `byId` match are **dropped**, not yielded as `undefined`. The signature
 * says `T[]`, and it used to lie: an id left in `allIds` after its entry was deleted
 * produced a hole that every caller had to guard. `getProviderLDSchema` remembered to;
 * `useCategoriesList` did not, so a stale id rendered a blank card.
 */
export const normalizedToFlat = <T extends { id: string }>(data: Normalized<T>): T[] => {
  return data.allIds.reduce<T[]>((acc, itemId) => {
    const item = data.byId[itemId]
    if (item) acc.push(item)
    return acc
  }, [])
}

/**
 * A duplicate id writes `byId` once and appends to `allIds` **once**, so the round trip
 * stays lossless. It used to append twice while `byId` kept only the last write, which
 * rendered the same entity twice — and React then saw two children with one key.
 */
export const flatToNormalized = <T extends { id: string }>(data: T[]): Normalized<T> => {
  return data.reduce(
    (acc, item) => {
      if (!item.id) return acc
      const isNew = !(item.id in acc.byId)
      acc.byId[item.id as T['id']] = item
      if (isNew) acc.allIds.push(item.id)
      return acc
    },
    {
      allIds: [] as Normalized<T>['allIds'],
      byId: {} as Normalized<T>['byId'],
    }
  )
}
