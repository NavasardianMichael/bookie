---
name: commit-and-push
description: Verify, then commit the working tree with a Conventional Commits message and push to the current branch. Use only when the user explicitly asks to commit and push.
disable-model-invocation: true
---

# Commit and push

Read and execute `.claude/commands/commit-and-push.md` as the full procedure.

The user's slash argument (optional scope or note) is `$ARGUMENTS` where the command references it.

Only run when the user explicitly invoked this skill — do not commit unprompted.
