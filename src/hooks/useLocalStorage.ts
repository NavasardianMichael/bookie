import { useCallback, useMemo } from 'react'

export default function useLocalStorage<T>(key: string, initialValue: T): [() => unknown, (x: T) => void, () => void] {
  const getStoredValue = useCallback(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (_error) {
      return initialValue
    }
  }, [initialValue, key])

  const setValue = useCallback(
    (value: T): void => {
      try {
        window.localStorage.setItem(key, JSON.stringify(value))
      } catch (_error) {}
    },
    [key]
  )

  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key)
    } catch (_error) {}
  }, [key])

  return useMemo(() => [getStoredValue, setValue, removeValue], [getStoredValue, setValue, removeValue])
}
