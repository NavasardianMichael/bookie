---
description: Turn a practice to adopt or avoid into a durable, enforced rule in the right doc.
argument-hint: <the practice — e.g. "always memoize slot generation" or "never use raw Modal, use AppSheet">
---

# Adopt or forbid a practice

Take `$ARGUMENTS` and turn it into a rule that lives in the right place, is written in
this repo's voice, and is **enforced** rather than merely stated.

Do not just append a bullet somewhere. Work through the steps below — most of the value
is in steps 2 and 3, which are what stop the docs filling with rules nobody follows.

## 1. Classify

- **DO** (adopt) or **DON'T** (avoid)?
- **Which layer** does it govern? API, store, components, styles, app/routes, helpers,
  server, tests — or is it genuinely global?
- **Is it a rule or a procedure?** A rule is a constraint ("a hex belongs only in
  `tokens.ts`"). A procedure is a sequence ("how to scaffold a domain"). Procedures
  belong in a skill, not a rule list.

If `$ARGUMENTS` is vague ("write better code"), ask for the specific behaviour before
writing anything. A rule that cannot be checked cannot be followed.

## 2. Check it is not already covered — and does not conflict

Search before writing:

```bash
grep -rni "<key terms>" CLAUDE.md src/*/CLAUDE.md server/CLAUDE.md tests/CLAUDE.md .claude/skills/
```

Then decide:

- **Already stated** → do not duplicate. Sharpen the existing wording if the new phrasing
  is better, and say that is what you did.
- **Contradicts an existing rule** → **stop and surface the conflict.** Quote both and ask
  which wins. Never leave two rules that disagree.
- **Already enforced by ESLint** (`eslint.config.mjs` — `eqeqeq`, `prefer-const`,
  `no-var`, `object-shorthand`, `prefer-template`, `@typescript-eslint/no-unused-vars`,
  the `jsx-a11y` set, `simple-import-sort`) → say so and stop. A doc restating a lint
  rule adds noise and rots independently. If it *could* be a lint rule but isn't,
  propose adding it there instead — that is strictly better than prose.

## 3. Verify it against the actual codebase

**This is the step that determines whether the rule is worth writing.** Count how much
existing code already complies:

```bash
# whatever pattern expresses the practice
grep -rnE "<pattern>" src --include=*.ts --include=*.tsx | wc -l
```

Then judge honestly:

| Finding | What it means |
|---|---|
| Code already complies | Good — the rule documents an existing convention. Write it. |
| A handful of violations | Write the rule, list the violations, offer to fix them now. |
| Violated nearly everywhere | The rule contradicts how this codebase is built. **Say so.** Either it needs a migration first (add it to `docs/BACKLOG.md` and write the rule as the target state), or it is the wrong rule. Do not quietly write a rule the code ignores. |

Report the count either way. "This holds in 34 places and is violated in 2" is far more
useful than "added a rule".

## 4. Put it where it belongs

Follow the routing table in `CLAUDE.md` § *Keeping the docs current*:

| Kind | Destination |
|---|---|
| Global constraint, applies everywhere | `CLAUDE.md` → **Working rules** |
| Global prohibition | `CLAUDE.md` → **Forbidden** |
| Layer-specific rule | That layer's `CLAUDE.md` (`src/api`, `src/app`, `src/components`, `src/helpers`, `src/store`, `src/styles`, `server`, `tests`) |
| "Do not copy this existing code" | That layer's **Known non-canonical code** section |
| A procedure, not a constraint | The matching skill in `.claude/skills/` |
| Needs a migration before it is true | `docs/BACKLOG.md`, phrased as the target state |

**Default to a nested `CLAUDE.md`.** The root file is loaded on every single turn; nested
ones load only when that directory is touched. A rule about Zustand does not need to be
in context while someone edits CSS. Only put it in the root file if it genuinely applies
everywhere.

## 5. Write it in the house voice

- **Imperative and specific.** "Route every `className` through `cn`", not "consider
  using cn".
- **Give the why in one clause**, especially the failure it prevents. The existing rules
  do this — *"antd seed colours must be literal hex, because `colorPrimary` is fed to
  antd's palette generator and a `var()` string produces garbage swatches."* A rule with
  a reason survives; a bare assertion gets argued with.
- **Cite a real file:line** from this codebase where it applies.
- No hedging, no restating the obvious, no more than a few lines.

## 6. Give it teeth

If the practice is mechanically checkable, add a **grep gate** next to the existing ones
in the relevant `CLAUDE.md` (`src/styles/CLAUDE.md` has the established format):

```bash
grep -rnE "<anti-pattern>" src --include=*.tsx    # 0
```

Scope every gate with `--include=` — without it the gate matches the very doc that
describes it and can never pass. Run it and confirm the stated count is real.

Better still: if it can be an **ESLint rule**, propose that instead. Enforcement beats
documentation. Say which you chose and why.

## 7. Verify and report

- If you changed code, run `pnpm typecheck && pnpm lint && pnpm test`.
- Re-run any gate you added and confirm the number.
- Report: what the rule now says, which file it went in, how the codebase measured
  against it, and whether anything still violates it.

## Examples

**`/best-avoid-practices never import @ant-design/icons in a Server Component`**
→ Already covered in `src/styles/CLAUDE.md` trap #3 and `src/components/CLAUDE.md`.
Report that, offer to strengthen the wording. Do not duplicate.

**`/best-avoid-practices prefer AppSheet over a raw antd Modal`**
→ Layer rule → `src/components/CLAUDE.md`. Gate:
`grep -rn "<Modal" src --include=*.tsx` and check each remaining use is deliberate.

**`/best-avoid-practices always use === instead of ==`**
→ Already enforced by `eqeqeq: ['error', 'always']`. Say so and stop.

**`/best-avoid-practices every store action must be wrapped in try/finally`**
→ Verify first. The auth store is the only one touching `isPending`, and it *lacks* this
(a known defect in `docs/BACKLOG.md`). So the rule is right but the code does not follow
it yet — write it as the target, link the backlog entry, offer to fix the one violation.
