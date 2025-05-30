import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { registerThunk } from '@store/consumers/thunk'

export const useRegister = (type: 'phone' | 'google') => {
  console.log({ type })

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleRegister = async (values: any) => {
    setIsLoading(true)
    setError(null)

    try {
      await registerThunk(values)
      router.push('/auth/login')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return { handleRegister, isLoading, error }
}
