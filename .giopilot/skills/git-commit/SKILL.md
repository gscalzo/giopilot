---
name: git-commit
description: Stage changes and write a clean Conventional Commit
---

# Git commit

Follow these steps to create a well-formed commit.

1. Run `git status` and `git diff` to understand what changed.
2. Group related changes. If the working tree mixes unrelated changes, commit them separately.
3. Stage the relevant files with `git add`.
4. Write a Conventional Commit message:
   - Format: `<type>(<scope>): <subject>`
   - Types: feat, fix, docs, refactor, test, chore.
   - Keep the subject under 72 characters, imperative mood, no trailing period.
5. Add a short body only if the *why* is not obvious from the subject.
6. Show the user the final `git log -1` and stop. Do not push unless asked.
