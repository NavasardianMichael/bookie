import axios from 'axios'

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  formSerializer: {
    indexes: null,
  },
})

axiosInstance.interceptors.request.use((config) => {
  return config
})

axiosInstance.interceptors.response.use(null, (error) => {
  if (error.response?.status === 401) {
    // window.location.href = ROUTES.accountTypeSelection
  }
  return Promise.reject(error)
})

export default axiosInstance
