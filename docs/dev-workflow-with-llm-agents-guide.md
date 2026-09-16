# Dev Workflow with LLM Agents

This guide describes how to use the LLM agent pipeline for feature development and bug fixes in the CloudHospital.Api repository.

---

## Overview

The workflow is structured as a gated pipeline. Each stage produces an artifact and waits for approval before the next stage begins.

```
Issue → /dev-plan → (review gate) → /dev-implementation → (review gate) → /dev-pr
```

Skill commands are invoked in Claude Code via `/skill-name`. Each skill maps to a dedicated sub-agent.

---

## Agents & Skills

| Skill | Agent | Role |
|-------|-------|------|
| `/dev-plan` | `planner` | Analyzes GitHub issue → writes `.work/plans/` |
| `/dev-plan-verifying` | — | Validates plan quality; opens or closes the plan approval gate |
| `/dev-implementation` | `coder` | Implements tasks from plan → builds → triggers verifier |
| `/dev-implementation-review` | — | 4-agent parallel code review harness |
| `/dev-pr` | `pr-writer` | Squashes WIP commits → pushes → creates draft PR on GitHub |
| `/dev-pr-code-review` | `pr-code-reviewer` | Posts line-level review comments on GitHub PR |
| `/dev-status` | — | Prints current workflow stage and next step |
| `/dev-complete` | — | Marks workflow complete; writes completion report |

---

## Stage 1 — Planning (`/dev-plan`)

**Trigger:** Start of work on a new feature branch.

```
/dev-plan https://github.com/iCloudHospital/CloudHospital.Api/issues/{issue-number}
```

The planner agent:
1. Reads the current branch and extracts the issue number.
2. Fetches the GitHub issue (title, body, comments).
3. Surveys the codebase for affected files.
4. Writes the plan to `.work/plans/{branch-name}/00.{task-summary}.md`.
5. Sets status to `계획확인대기` and creates a gate sentinel at `.work/gates/{issue-number}.pending`.

**Output artifact:** `.work/plans/{branch-name}/00.{task-summary}.md`

### Plan approval

```
/dev-plan-verifying         # reviews the plan
/dev-plan-verifying 계획 승인  # approves and opens the implementation gate
```

---

## Stage 2 — Implementation (`/dev-implementation`)

**Trigger:** After the plan approval gate is cleared.

```
/dev-implementation
```

**Output artifacts:**
- Modified/created source files
- `.work/tasks/{branch-name}/coder/log.{timestamp}.md`
- `.work/reportings/{branch-name}/00.{name}.md` (verifier report)

### Implementation review

The code review harness (4 parallel agents) runs automatically after the coder finishes. The result sets status to `구현확인대기`.

To manually trigger review:
```
/dev-implementation-review
```

To approve and proceed:
```
구현 승인
```

---

## Stage 3 — Pull Request (`/dev-pr`)

**Trigger:** After implementation review is approved.

```
/dev-pr
```

The pr-writer agent:
1. Runs `git reset --soft` to squash all WIP commits into one clean commit.
2. Pushes the branch.
3. Creates a draft PR on GitHub targeting `dev`.
4. Saves a Korean summary to `.work/tasks/pr/{branch-name}.{timestamp}.md`.

---

## .work Directory Structure

```
.work/
├── plans/
│   └── {branch-name}/
│       └── 00.{task-summary}.md        ← plan document (source of truth)
├── tasks/
│   └── {branch-name}/
│       ├── planner/
│       │   └── log.{timestamp}.md      ← planner session log
│       ├── coder/
│       │   └── log.{timestamp}.md      ← coder session log
│       ├── approvals.md                ← gate approval history
│       └── pr/
│           └── {branch-name}.{ts}.md   ← PR body Korean summary
├── reportings/
│   └── {branch-name}/
│       └── 00.{name}.md                ← verifier report
├── implementation-reviews/
│   └── {branch-name}/
│       └── {timestamp}.md              ← code review report
├── gates/
│   └── {issue-number}.pending          ← sentinel file (deleted on approval)
├── policies/                           ← workflow policy documents
└── current.json                        ← active workflow state
```

### Branch name normalization

All path components use the normalized branch name:

```bash
git branch --show-current | sed 's|^[^/]*/||'
# feature/13358-foo → 13358-foo
# fix/13485-bar     → 13485-bar
```

File names use **filesystem-safe characters only**: lowercase letters, digits, hyphens. No spaces, Korean, or special characters.

---

## Gate System

Gates prevent stages from running out of order.

| Gate file | Created by | Deleted by |
|-----------|-----------|-----------|
| `.work/gates/{issue}.pending` | `/dev-plan` | `/dev-plan-verifying 계획 승인` |

If a gate file exists, `/dev-implementation` will refuse to run and will display the current status.

---

## Session Logging

Every agent writes a session log in real time. Log paths:

| Agent | Log path |
|-------|----------|
| planner | `.work/tasks/{branch-name}/planner/log.{timestamp}.md` |
| coder | `.work/tasks/{branch-name}/coder/log.{timestamp}.md` |
| verifier | `.work/reportings/{branch-name}/00.{name}.md` |
| pr-writer | `.work/tasks/pr/{branch-name}.{timestamp}.md` |

Log entry format:
```
[2026-02-23T14:30:00] START: branch=feature-13196-...
[2026-02-23T14:30:10] STEP: Fetched GitHub issue #13196
[2026-02-23T14:31:00] WRITE: Modified CloudHospital.Domain/Entities/Foo.cs
[2026-02-23T14:35:00] BUILD: dotnet build — SUCCESS (0 errors)
[2026-02-23T14:35:10] DONE: 8 tasks completed
```

---

## Workflow State (`current.json`)

`.work/current.json` tracks the active issue and stage:

```json
{
  "issue": 13492,
  "branch": "feature/1-add-v1-endpoint",
  "stage": "구현중",
  "updated": "2026-04-21T10:00:00"
}
```

Possible stages: `계획중` → `계획확인대기` → `구현중` → `구현확인대기` → `PR준비중` → `완료`

---

## Tips

- Run `/dev-status` at the start of any session to see where you are.
- The coder agent does **not** run EF Core migrations — always run them manually after implementation:
  ```bash
  dotnet ef migrations add <Name> \
    --project CloudHospital.Persistence \
    --startup-project CloudHospital.AdminApi
  ```
- To remove all `[TASK-CHANGE]` traceable comments after review: tell the coder agent "변경 주석 전부 제거해줘".
- The verifier agent is launched **automatically** by the coder — you do not need to invoke it manually.
