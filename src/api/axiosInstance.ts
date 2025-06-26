import axios from 'axios'

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
console.log({
  oidqwn: process.env.API_URL,
})

axiosInstance.interceptors.request.use((config) => {
  console.log({ config })

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
