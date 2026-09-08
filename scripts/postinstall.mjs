#!/usr/bin/env node
/**
 * Runs after `pnpm install`:
 * 1. prisma generate (always)
 * 2. prisma migrate deploy + db seed when server/.env exists and Postgres is reachable
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// Windows needs a shell to resolve `pnpm.cmd` — Node refuses to spawn a `.cmd` without
// one. But Node 24 raises DEP0190 when an args array is combined with `shell: true`,
// because the args are then concatenated rather than escaped. Every argument passed
// below is a static literal, so pre-joining the command is equivalent and stays quiet.
const useShell = process.platform === 'win32'

function run(label, command, args, { allowFailure = false } = {}) {
  console.log(`\n[postinstall] ${label}...`)
  const options = { cwd: rootDir, stdio: 'inherit' }
  const result = useShell
    ? spawnSync([command, ...args].join(' '), { ...options, shell: true })
    : spawnSync(command, args, options)

  if (result.status !== 0 && !allowFailure) {
    process.exit(result.status ?? 1)
  }

  return result.status === 0
}

run('Generating Prisma client', 'pnpm', ['--filter', 'bookie-server', 'run', 'db:generate'])

const envFile = path.join(rootDir, 'server', '.env')
if (!existsSync(envFile)) {
  console.log(
    '\n[postinstall] server/.env not found — skipping migrate/seed.',
    'Copy server/.env.example to server/.env, start Postgres (pnpm db:up), then run pnpm db:setup.'
  )
  process.exit(0)
}

const migrated = run('Applying migrations', 'pnpm', ['--filter', 'bookie-server', 'run', 'db:deploy'], {
  allowFailure: true,
})

if (!migrated) {
  console.warn(
    '\n[postinstall] Migrations skipped — Postgres may be down.',
    'Run: pnpm db:up && pnpm db:setup'
  )
  process.exit(0)
}

const seeded = run('Seeding database', 'pnpm', ['--filter', 'bookie-server', 'run', 'db:seed'], {
  allowFailure: true,
})

console.log(
  seeded
    ? '\n[postinstall] Database setup complete.'
    : '\n[postinstall] Migrations applied but seeding failed — run `pnpm db:seed` for the error.'
)
