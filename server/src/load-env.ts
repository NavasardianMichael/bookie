import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Loads the API's env files from `server/`, never from `process.cwd()` — `pnpm watch` runs
 * concurrently from the repo root, so `import 'dotenv/config'` would read the Next.js env and
 * leave Prisma with the wrong `DATABASE_URL`.
 *
 * The mode's own file first, then the shared one, as Next.js cascades:
 * `server/.env.<NODE_ENV>.local` (`development` when unset), then `server/.env`. dotenv never
 * overwrites a variable that is already set, so the first file to name a key wins, and a real
 * environment variable beats both — which is how production runs: systemd's `EnvironmentFile`
 * sets everything and the release holds no env file, so neither load finds anything there.
 */
const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const mode = process.env.NODE_ENV || 'development'

dotenv.config({ path: [path.join(serverDir, `.env.${mode}.local`), path.join(serverDir, '.env')], quiet: true })
