import { useCallback, useMemo } from 'react'

export default function useLocalStorage<T>(key: string, initialValue: T): [() => any, (x: T) => void, () => void] {
  const getStoredValue = useCallback(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.error(error)
      return initialValue
    }
  }, [initialValue])

  const setValue = useCallback(
    (value: T): void => {
      try {
        window.localStorage.setItem(key, JSON.stringify(value))
      } catch (error) {
        console.error(error)
      }
    },
    [key]
  )

  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key)
    } catch (error) {
      console.error(error)
    }
  }, [key])

  return useMemo(() => [getStoredValue, setValue, removeValue], [getStoredValue, setValue, removeValue])
}
