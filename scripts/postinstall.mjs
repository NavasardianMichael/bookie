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

function run(label, command, args, { allowFailure = false } = {}) {
  console.log(`\n[postinstall] ${label}...`)
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })

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

run('Seeding database', 'pnpm', ['--filter', 'bookie-server', 'run', 'db:seed'], {
  allowFailure: true,
})

console.log('\n[postinstall] Database setup complete.')
