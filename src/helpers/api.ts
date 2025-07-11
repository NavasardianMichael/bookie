export const paramsToQueryString = (params: Record<string, unknown>): string => {
  if (!Object.keys(params).length) return ''

  const allEntries: [string, string][] = []

  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      value.forEach((item) => {
        allEntries.push([key, String(item)])
      })
    } else if (value !== undefined && value !== null) {
      allEntries.push([key, String(value)])
    }
  }

  const queryString = new URLSearchParams(allEntries).toString()

  return queryString
}

export const getMockAsFakeAPI = async (data: unknown) => {
  return Promise.resolve(data)
}
