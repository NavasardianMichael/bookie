import { toDataURL } from 'qrcode'

/** PNG data URL of `text`. Generated on demand — do not call this at module load. */
export const toQrDataUrl = (text: string): Promise<string> =>
  toDataURL(text, { margin: 1, width: 512, errorCorrectionLevel: 'M' })
