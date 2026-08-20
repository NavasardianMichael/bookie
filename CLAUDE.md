# Project Rules

The full development rules for this repo live in `.github/copilot-instructions.md`.

@.github/copilot-instructions.md

## Env files (hard rule)

Never read, open, search, print, or otherwise surface the contents of any file whose
name starts with `.env` — at any path, at any depth. This includes, but is not limited
to, `.env`, `.env.local`, `.env.development`, `.env.production`, `.env.test`,
`.env.*.local`, and `server/.env`. It applies to every access route: Read, Grep, Glob,
shell commands (`cat`, `type`, `Get-Content`, `grep`, `rg`, `sed`, `head`, `tail`,
`dotenv` dumps), and subagents.

**The only exception is `*.env.example`** — `.env.example` and `server/.env.example` may
be read freely. Use them to learn which keys exist and to document them. They hold
placeholders, never real values.

If a real env file is missing, copy the matching `.env.example` and leave placeholders
for the user to fill in. Do not inspect a secret env file to discover a value, and do
not ask for secret values to be pasted into the conversation — describe which key is
missing instead.

Reading a secret env file is also blocked at the harness level by the `permissions.deny`
rules in `.claude/settings.json`. That list enumerates the common filenames; the rule
above is the general one and covers every `.env*` name, including ones not listed there.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
