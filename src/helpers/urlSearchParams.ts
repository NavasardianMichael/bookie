export const getURLSearchParamValue = (key: string) => {
  const urlSearchParams = new URLSearchParams(window.location.search)
  const queryParams = Object.fromEntries(urlSearchParams.entries())
  return queryParams[key]
}

export const getURLSearchParams = () => {
  const urlSearchParams = new URLSearchParams(window.location.search)
  const queryParams = Object.fromEntries(urlSearchParams.entries())
  return queryParams
}
