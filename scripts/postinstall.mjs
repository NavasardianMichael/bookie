#!/usr/bin/env node
/**
 * Runs after `pnpm install`:
 * 1. stop a running API dev server (Windows only — see stopApiDevServer)
 * 2. prisma generate (always)
 * 3. prisma migrate deploy + db seed when server/.env exists and Postgres is reachable
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

// The default `port` in server/src/config.ts.
const API_PORT = 9004

/**
 * A running API holds Prisma's query engine DLL open, and on Windows `prisma generate`
 * then fails with EPERM renaming the new engine over it. So stop whichever node process
 * listens on the API port. `tsx watch` outlives its child and restarts it by itself once
 * the regenerated client lands. Other platforms can replace a loaded library, so they
 * skip this.
 */
function stopApiDevServer() {
  if (process.platform !== 'win32') return

  const netstat = spawnSync('netstat', ['-ano'], { encoding: 'utf8' })
  const pids = new Set()
  for (const line of netstat.stdout?.split(/\r?\n/) ?? []) {
    // TCP  [::]:9004  [::]:0  LISTENING  61124 — matched on the zero remote port rather
    // than the state column, which Windows localises.
    const [proto, local, remote, , pid] = line.trim().split(/\s+/)
    if (proto === 'TCP' && local?.endsWith(`:${API_PORT}`) && remote?.endsWith(':0')) {
      pids.add(pid)
    }
  }

  for (const pid of pids) {
    const task = spawnSync('tasklist', ['/FI', `PID eq ${pid}`, '/FO', 'CSV', '/NH'], {
      encoding: 'utf8',
    })
    if (!task.stdout?.toLowerCase().startsWith('"node.exe"')) {
      console.warn(`\n[postinstall] :${API_PORT} is held by PID ${pid}, which is not node — leaving it.`)
      continue
    }
    console.log(`\n[postinstall] Stopping the API dev server on :${API_PORT} (PID ${pid})...`)
    spawnSync('taskkill', ['/PID', pid, '/T', '/F'], { stdio: 'ignore' })
  }
}

stopApiDevServer()

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
