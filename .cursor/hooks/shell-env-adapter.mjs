#!/usr/bin/env node
/**
 * Adapts Cursor beforeShellExecution input to the Claude PreToolUse payload
 * expected by .claude/hooks/deny-env-access.mjs, then maps the response back.
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const readStdin = async () => {
  const chunks = []
  for await (const chunk of process.stdin) chunks.push(chunk)
  return Buffer.concat(chunks).toString('utf8')
}

const main = async () => {
  let cursorInput
  try {
    cursorInput = JSON.parse(await readStdin())
  } catch {
    process.exit(0)
  }

  const command = cursorInput?.command
  if (typeof command !== 'string' || !command) {
    process.exit(0)
  }

  const hookPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../.claude/hooks/deny-env-access.mjs'
  )

  const result = spawnSync(process.execPath, [hookPath], {
    input: JSON.stringify({ tool_input: { command } }),
    encoding: 'utf8',
    maxBuffer: 1024 * 1024,
  })

  if (result.stdout) {
    try {
      const parsed = JSON.parse(result.stdout)
      const nested = parsed?.hookSpecificOutput
      if (nested?.permissionDecision === 'deny') {
        const reason =
          nested.permissionDecisionReason ??
          'Blocked: shell command references a secret env file (CLAUDE.md hard rule).'
        process.stdout.write(
          JSON.stringify({
            permission: 'deny',
            user_message: reason,
            agent_message: reason,
          })
        )
        process.exit(2)
      }
    } catch {
      // fall through — allow on unparseable hook output
    }
  }

  process.stdout.write(JSON.stringify({ permission: 'allow' }))
  process.exit(0)
}

main()
