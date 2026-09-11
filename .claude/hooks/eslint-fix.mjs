#!/usr/bin/env node
/**
 * PostToolUse: run `eslint --fix` on the single file just written.
 *
 * Import order is enforced by `simple-import-sort`, so hand-written imports are almost
 * always wrong until something sorts them. Without this hook that costs a whole extra
 * round trip — edit, then `pnpm lint-fix` over the entire repo (~6s) to fix one file's
 * import block. One file through eslint's own binary is ~1.5s and happens at write time.
 *
 * Two deliberate choices:
 *
 * - **Never blocks.** A lint failure must not make a successful edit look failed, so the
 *   hook always exits 0. Whatever `--fix` could not repair is handed back as
 *   `additionalContext` instead — which is the point: an unfixable error surfaces
 *   immediately rather than at the next `pnpm verify`.
 * - **`--max-warnings 0`, matching `pnpm lint`.** Most of this repo's own conventions
 *   (the export-style rule, for one) are warnings; without the flag eslint exits 0 and
 *   the hook would stay silent about exactly the things it exists to catch.
 * - **eslint's bin directly, not `npx`.** `npx` re-resolves the package on every call and
 *   costs ~0.7s of the runtime for nothing.
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const ESLINT_BIN = path.join(ROOT, 'node_modules', 'eslint', 'bin', 'eslint.js')
const LINTABLE = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs'])

const readStdin = async () => {
  const chunks = []
  for await (const chunk of process.stdin) chunks.push(chunk)
  return Buffer.concat(chunks).toString('utf8')
}

/** Silence is the success case — the fix already landed in the file. */
const done = (context) => {
  if (context) {
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: context },
      })
    )
  }
  process.exit(0)
}

const main = async () => {
  let payload
  try {
    payload = JSON.parse(await readStdin())
  } catch {
    return done()
  }

  const filePath = payload?.tool_input?.file_path
  if (typeof filePath !== 'string' || !filePath) return done()

  const absolute = path.resolve(ROOT, filePath)
  const relative = path.relative(ROOT, absolute)

  // Outside the repo, or inside node_modules — not ours to lint.
  if (relative.startsWith('..') || path.isAbsolute(relative)) return done()
  if (relative.split(path.sep).includes('node_modules')) return done()
  if (!LINTABLE.has(path.extname(absolute))) return done()
  if (!existsSync(absolute) || !existsSync(ESLINT_BIN)) return done()

  const result = spawnSync(process.execPath, [ESLINT_BIN, '--fix', '--no-warn-ignored', '--max-warnings', '0', absolute], {
    cwd: ROOT,
    encoding: 'utf8',
  })

  if (result.status === 0) return done()

  const report = [result.stdout, result.stderr].filter(Boolean).join('\n').trim()
  return done(
    report
      ? `eslint --fix ran on ${relative.split(path.sep).join('/')} and left these unresolved:\n${report}`
      : undefined
  )
}

main()
