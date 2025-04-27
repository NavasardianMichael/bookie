import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { logoutAPI } from '@api/auth/main'

export const useLogout = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleLogout = async () => {
    setIsLoading(true)
    setError(null)

    try {
      await logoutAPI()
      router.push('/auth/login')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return { handleLogout, isLoading, error }
}
