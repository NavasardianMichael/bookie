export const generateGoogleMapsLink = (address: string) => {
  const baseUrl = 'https://www.google.com/maps/search/?api=1&query='
  const encodedAddress = encodeURIComponent(address)
  return `${baseUrl}${encodedAddress}`
}
