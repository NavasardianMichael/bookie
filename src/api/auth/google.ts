import axiosInstance from 'api/axiosInstance'
import { ENDPOINTS } from './endpoints'

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function googleSignIn() {
  const clientID = import.meta.env.VITE_APP_GOOGLE_CLIENT_ID // Replace with your client ID
  const redirectUri = `${window.location.origin}/auth-popup` // Temporary page to handle the callback
  const scopes = ['openid', 'email', 'profile']
  const nonce = 'testnonce'

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientID)}&response_type=id_token&scope=${encodeURIComponent(scopes.join(' '))}&redirect_uri=${encodeURIComponent(redirectUri)}&nonce=${encodeURIComponent(nonce)}`
  const popup = window.open(authUrl, 'googleSignIn', 'width=500,height=600')

  const checkForToken = async () => {
    if (!popup || popup.closed) {
      console.error('Popup closed by user.')
      return false
    }
    try {
      const popupUrl = popup.location.href
      if (popupUrl.includes('id_token')) {
        const hashParams = new URLSearchParams(popupUrl.split('#')[1])
        const idToken = hashParams.get('id_token')
        console.log('Google ID Token:', idToken)
        const data = {
          idToken: idToken,
        }

        const response = await axiosInstance.post(ENDPOINTS.googleLogin, data, {
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (response.data?.isSuccess) {
          popup.close()
          return true
        } else {
          popup.close()
          console.error('Failed to log in with Google.')
          return false
        }
      }
    } catch (e) {
      console.log({ e })
    }
    await wait(500)
    return checkForToken()
  }
  await checkForToken()
}
