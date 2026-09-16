⚠️ SCOPE — This file applies ONLY while the `dev-workflow:dev-complete` skill is running.
NEVER apply it to any other skill, task, or conversation.
Seeing this file in context is NOT permission to use it. Check first that
`dev-workflow:dev-complete` is the skill actually running.

# dev-workflow:dev-complete skill rules

## Archive .work/ (REQUIRED)

- After the `dev-complete` skill writes its completion report, check `use_work_dir_archiving` in `.claude/rules/dev-workflow.md`.
  - If it is `true`: you MUST run `.scripts/archive-work.sh`. Do not skip this step.
  - If it is `false`: skip this step.
- Only do this when you are in a work-branch worktree (for example `{작업 브랜치}/`), not in the `main` worktree. Running it in `main` breaks the copy, because `../main/` would then point to itself.
- Running `.scripts/archive-work.sh` is the REQUIRED and ONLY way to copy `.work/` into `../main/.work-archive/`. The copy from `.work/` to `.work-archive/` is not done any other way.

Steps:
1. From the root of the work-branch worktree, run `.scripts/archive-work.sh`.
2. This script copies everything in `.work/` (except `current.json`) into `../main/.work-archive/`.
3. After it runs, check that `.work-archive/` now has the folders for this task (for example `plans`, `reports`, `results`).

- If `.scripts/archive-work.sh` is missing or not executable, do not write your own copy logic instead. Tell the user.
