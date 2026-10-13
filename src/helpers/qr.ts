/** PNG data URL of `text`. `qrcode` loads on this call, not with the page. */
export const toQrDataUrl = async (text: string): Promise<string> => {
  const { toDataURL } = await import('qrcode')
  return toDataURL(text, { margin: 1, width: 512, errorCorrectionLevel: 'M' })
}
