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
