export const minsToDisplayFormat = (mins: number) => {
  const hours = Math.floor(mins / 60)
  const minutes = mins % 60
  return {
    hours,
    minutes,
    text: `${hours ? `${hours} hours` : ''}${minutes ? `${hours ? ', ' : ''}${minutes} minutes` : ''}`,
  }
}
