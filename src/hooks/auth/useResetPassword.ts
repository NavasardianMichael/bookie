import { useRouter } from 'next/navigation'
import { useState } from 'react'


export const useResetPassword = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleResetPassword = async (email: string) => {
    setIsLoading(true)
    setError(null)
    console.log({ email });

    try {
      // await resetPasswordAPI({ email })
      router.push('/auth/login')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return { handleResetPassword, isLoading, error }
}
