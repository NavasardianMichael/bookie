/**
 * Stable codes from the API's `IMPORT_ERROR` (`server/src/lib/import-errors.ts`), pinned by
 * `tests/unit/server/importErrors.spec.ts`. Their copy is `Errors.codes.*`.
 */
export const IMPORT_ERROR_CODES = {
  photoImportUnavailable: 4401,
  photoUnreadable: 4402,
} as const

/**
 * Rows one photo may become, and the length of the note sent with it. Keep in step with
 * `IMPORT_MAX_ROWS` / `IMPORT_NOTE_MAX` in `server/src/services/bookingImport.ts`, which
 * refuse more.
 */
export const IMPORT_MAX_ROWS = 30
export const IMPORT_NOTE_MAX = 300

/**
 * What the picker offers. `image/*` would also offer GIFs and SVGs the API refuses (415);
 * HEIC is listed so an iPhone's own photos are not greyed out on desktop.
 */
export const IMPORT_PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif'

/** The API's own ceiling (`MAX_PHOTO_BYTES`); a larger file is refused before it uploads. */
export const IMPORT_PHOTO_MAX_BYTES = 10 * 1024 * 1024

/**
 * The longest edge a photo is scaled down to before upload. Handwriting stays legible well
 * below a phone camera's resolution, and a smaller file uploads faster on mobile data and
 * spends fewer of the shared key's tokens.
 */
export const IMPORT_PHOTO_MAX_EDGE = 2048
