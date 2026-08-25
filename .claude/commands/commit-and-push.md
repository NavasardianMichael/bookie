---
description: Verify, then commit the working tree with a Conventional Commits message and push to the current branch.
argument-hint: [optional scope or note about what changed]
---

# Commit and push

Commit everything currently staged or modified, with a properly formed
[Conventional Commits v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/) message,
and push.

## Hard constraints for this repo

- **Never create or switch branches.** Commit on whatever branch is checked out. If that
  is `master`, commit to `master` — do not offer to branch first.
- **Never include task, ticket, or issue numbers.** They do not exist in this project.
- **Never use `--no-verify`.** The Husky pre-commit hook runs `lint-staged`; if it fails,
  fix the cause.

## Steps

1. **Look at what you're committing.** `git status` and `git diff` (plus
   `git diff --staged` if anything is staged). Never commit blind.
2. **Verify.** Run `pnpm typecheck && pnpm lint && pnpm test`. If any fails, **stop and
   report** — do not commit broken work, and do not "fix" it by narrowing what you commit
   unless the user asks.
3. **Group if needed.** If the diff spans clearly unrelated concerns, propose splitting
   into several commits and let the user choose before proceeding.
4. **Write the message** (format below).
5. **Commit**, then `git push`. If the branch has no upstream, use
   `git push -u origin HEAD`.
6. **Report** the commit hash, subject, and what was pushed where.

## Message format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types** — `feat` (a new feature, SemVer MINOR) and `fix` (a bug fix, SemVer PATCH) are
the two the spec defines; this repo also uses `build`, `chore`, `ci`, `docs`, `style`,
`refactor`, `perf`, `test`.

**Scope** — optional, a noun in parentheses naming the area: `feat(booking):`,
`fix(provider-profile):`, `refactor(api):`. Use the domain or directory, not a file name.

**Description** — imperative mood, lowercase, no trailing period.
`add slot picker`, not `Added slot picker.`

**Breaking changes** — either a `!` before the colon (`feat(api)!: …`) **or** a
`BREAKING CHANGE: <description>` footer. Both is fine; at least one is required whenever
the public shape changes.

**Body** — one blank line after the description. Explain *why*, not what the diff already
shows.

**Footers** — one blank line after the body, git trailer format (`Token: value`). Append
the `Co-Authored-By:` trailer your harness instructions specify.

### Examples

```
fix(provider-profile): bind categories through the antd Form control contract

The categoryIds Form.Item wrapped a component that ignored antd's injected
value/onChange, so the store slot was never written while required + min:1
rules validated against it. The form could not be submitted at all.
```

```
feat(booking): add slot picker to the provider detail page
```

```
refactor(api)!: return normalized services from the provider processor

BREAKING CHANGE: getSingleProviderAPI now returns services as Normalized<T>
rather than an array. Callers indexing services[0] must use allIds/byId.
```

## Judgement

- Describe what the change *does*, not which files moved.
- One logical change per commit. A formatting sweep and a bug fix are two commits.
- If the diff contains something that looks accidental — a stray debug log, a committed
  secret, an unrelated large file — say so before committing rather than including it.
