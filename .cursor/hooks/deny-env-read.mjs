#!/usr/bin/env node
/**
 * beforeReadFile guard: block reads of secret `.env*` files.
 * Allowed: `*.env.example` only.
 */

const isSecretEnvBasename = (basename) => {
  if (basename === '.env') return true
  if (basename.startsWith('.env.') && !basename.endsWith('.example')) return true
  return false
}

const readStdin = async () => {
  const chunks = []
  for await (const chunk of process.stdin) chunks.push(chunk)
  return Buffer.concat(chunks).toString('utf8')
}

const respond = (payload, exitCode = 0) => {
  process.stdout.write(JSON.stringify(payload))
  process.exit(exitCode)
}

const main = async () => {
  let payload
  try {
    payload = JSON.parse(await readStdin())
  } catch {
    // Fail open on unparseable input so a hook glitch cannot wedge every Read.
    return respond({ permission: 'allow' })
  }

  const filePath = payload?.file_path
  if (typeof filePath !== 'string' || !filePath) {
    return respond({ permission: 'allow' })
  }

  const basename = filePath.replace(/\\/g, '/').split('/').pop() ?? ''
  if (isSecretEnvBasename(basename)) {
    const reason =
      `Blocked read of ${basename}. Secret env files must never be read (CLAUDE.md hard rule). ` +
      'Read the matching *.env.example instead to learn which keys exist.'
    return respond(
      {
        permission: 'deny',
        user_message: reason,
      },
      2
    )
  }

  return respond({ permission: 'allow' })
}

main().catch(() => respond({ permission: 'allow' }))
