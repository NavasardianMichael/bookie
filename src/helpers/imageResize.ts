/**
 * A photo scaled so its longest edge is at most `maxEdge`, re-encoded as JPEG. Client-only.
 *
 * Returned unchanged when there is nothing to gain — already small enough and a JPEG, or a
 * re-encode that came out larger — and when the browser cannot decode it at all (HEIC
 * outside Safari): the API accepts the original as it is.
 */
export const downscaleImage = async (file: File, maxEdge: number, quality = 0.85): Promise<File> => {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return file

  let bitmap: ImageBitmap
  try {
    // `from-image` applies the camera's EXIF rotation, or a portrait photo uploads sideways.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    return file
  }

  try {
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
    if (scale === 1 && file.type === 'image/jpeg') return file

    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const context = canvas.getContext('2d')
    if (!context) return file
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (!blob || blob.size >= file.size) return file
    return new File([blob], `${file.name.replace(/\.[^.]+$/, '') || 'photo'}.jpg`, { type: 'image/jpeg' })
  } finally {
    bitmap.close()
  }
}
