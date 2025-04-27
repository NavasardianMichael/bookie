import axios from 'axios'

console.log({ API_URL: process.env.API_URL })

const axiosInstance = axios.create({
  baseURL: process.env.API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  formSerializer: {
    indexes: null,
  },
})

axiosInstance.interceptors.request.use((config) => {
  if (config.url?.startsWith('/api/Identity/')) config.withCredentials = true
  return config
})

axiosInstance.interceptors.response.use(null, (error) => {
  if (error.status === 401) {
    // window.location.href = PUBLIC_PAGES.login
  }
  return Promise.reject(error)
})

export default axiosInstance
