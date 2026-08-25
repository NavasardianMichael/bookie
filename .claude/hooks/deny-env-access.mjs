#!/usr/bin/env node
/**
 * PreToolUse guard: block shell access to secret `.env*` files.
 *
 * `permissions.deny` in settings.json only covers the `Read` tool. Every shell is a
 * second, unguarded route to the same bytes — `cat`, `type`, `Get-Content`, `grep`,
 * `rg`, `sed`, `head`, `tail`, `node --env-file`, `dotenv`. This hook closes it for
 * Bash and PowerShell alike, which is why it is Node rather than a shell script.
 *
 * Allowed: `*.env.example` (placeholders only), and copying an example into place —
 * CLAUDE.md explicitly sanctions `cp server/.env.example server/.env` when a real env
 * file is missing.
 */

/**
 * Candidate `.env…` tokens. A single quantifier over a character class — deliberately
 * not `(\.[\w*-]+)*`, whose nested quantifier is a ReDoS shape, and this runs on every
 * shell command.
 *
 * Over-matches by design: `.environment` matches here and is rejected by `isEnvFile`.
 */
const ENV_TOKEN = /\.env[A-Za-z0-9_.*-]*/g

/** True only for `.env` itself or a `.env.<suffix>` variant — not `.environment`. */
const isEnvFile = (token) => token === '.env' || token.startsWith('.env.')

/** `cp .env.example .env` and friends — the one sanctioned way to create a real env file. */
const COPY_FROM_EXAMPLE = /^\s*(cp|copy|Copy-Item)\s/i

const readStdin = async () => {
  const chunks = []
  for await (const chunk of process.stdin) chunks.push(chunk)
  return Buffer.concat(chunks).toString('utf8')
}

const deny = (reason) => {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: reason,
      },
    })
  )
  process.exit(0)
}

const allow = () => process.exit(0)

const main = async () => {
  let payload
  try {
    payload = JSON.parse(await readStdin())
  } catch {
    // A malformed payload must not become a way to disable the guard, but it also
    // must not wedge every shell command. Fail open only on unparseable input.
    return allow()
  }

  const command = payload?.tool_input?.command
  if (typeof command !== 'string' || !command) return allow()

  const matches = command.match(ENV_TOKEN)
  if (!matches) return allow()

  const secrets = matches.filter((token) => isEnvFile(token) && !token.endsWith('.example'))
  if (!secrets.length) return allow()

  if (COPY_FROM_EXAMPLE.test(command) && command.includes('.env.example')) return allow()

  return deny(
    `Blocked: this command references ${[...new Set(secrets)].join(', ')}. ` +
      'Secret env files must never be read, searched, or printed (CLAUDE.md hard rule). ' +
      'Read the matching *.env.example instead to learn which keys exist.'
  )
}

main()
