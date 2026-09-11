#!/usr/bin/env node
/**
 * Adapts Cursor afterFileEdit input to the Claude PostToolUse payload expected by
 * .claude/hooks/eslint-fix.mjs. Cursor puts the path at the top level; Claude nests it
 * under `tool_input`. afterFileEdit is observational — there is no decision to map back,
 * so the hook's stdout is passed straight through.
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

  const filePath = cursorInput?.file_path
  if (typeof filePath !== 'string' || !filePath) process.exit(0)

  const hookPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../.claude/hooks/eslint-fix.mjs'
  )

  const result = spawnSync(process.execPath, [hookPath], {
    input: JSON.stringify({ tool_input: { file_path: filePath } }),
    encoding: 'utf8',
    maxBuffer: 1024 * 1024,
  })

  if (result.stdout) process.stdout.write(result.stdout)
  process.exit(0)
}

main()
