import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { forgotPasswordThunk } from '@store/providers/profile/thunk'

export const useForgotPassword = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleForgotPassword = async (email: string) => {
    setIsLoading(true)
    setError(null)

    try {
      await forgotPasswordThunk({ email })
      router.push('/auth/login')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return { handleForgotPassword, isLoading, error }
}
