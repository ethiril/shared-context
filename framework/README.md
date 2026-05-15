# Shared Context

Cross-repo coordination space for Claude Code agents working together on a single feature that spans multiple repositories.

> Human reader? → see [`QUICKSTART.md`](./QUICKSTART.md).

If you are an agent, work through the four steps below in order. Steps 1–3 are getting-started; Step 4 is the deep reference, read it only when a slash command isn't enough.

---

## Step 1 — Install (once per machine)

Two things: link the slash commands into your Claude config, and add the hooks to every repo that writes here.

Set `SHARED_CONTEXT_ROOT` to the absolute path of your local copy of this repo first:

```bash
export SHARED_CONTEXT_ROOT="/absolute/path/to/your/shared-context"

# 1a. Slash commands → user-level Claude config (works in every CWD).
mkdir -p ~/.claude/commands
ln -sf "$SHARED_CONTEXT_ROOT"/framework/commands/*.md ~/.claude/commands/
```

```jsonc
// 1b. Hooks → each participating repo's .claude/settings.local.json,
//     as a sibling of the existing "permissions" block.
//     Substitute the absolute path to your shared-context folder.
"hooks": {
  "PostToolUse": [
    {
      "matcher": "Write|Edit",
      "hooks": [
        { "type": "command", "command": "<SHARED_CONTEXT_ROOT>/framework/bin/hook-render.sh" },
        { "type": "command", "command": "<SHARED_CONTEXT_ROOT>/framework/bin/hook-orchestrate.sh" }
      ]
    }
  ]
}
```

Restart any open Claude Code sessions to pick up new commands. Open `dashboard.html` to see the result.

---

## Step 2 — Daily loop

Eight slash commands cover everything. Argument is the feature slug.

| Command                       | When                                                | What                                                                                          |
|-------------------------------|-----------------------------------------------------|-----------------------------------------------------------------------------------------------|
| `/resume <feature>`           | First message after `/clear`.                       | Reads MISSION + latest orchestrator snapshot + your inbox. ~5k tokens.                        |
| `/catch-up <feature>`         | New session or back after a break.                  | `/resume` + `_index.md` skim + recent decisions/contracts.                                    |
| `/check-in <feature>`         | Mid-session: the other repo just sent you something.| Reads only your inbox; reports a table; **pauses for go-ahead** before acking.                |
| `/audit <feature>`            | Verify history; something looks wrong.              | Full read, including superseded. Ignores the token budget.                                    |
| `/handoff <feature>`          | Before `/clear`. Leave a clean checkpoint.          | Writes digest + cursor. Digest triggers orchestrator refresh.                                 |
| `/pivot <feature> <reason>`   | Direction is changing.                              | Drops `kind: pivot` log + tombstones for retired items + fresh digest.                        |
| `/refresh <feature>`          | Update the human dashboard now.                     | Asks orchestrator to rebuild snapshot + `dashboard.html` + `_index.md`.                       |
| `/bootstrap <feature>`        | Starting a new feature.                             | Scaffolds folders, copies `templates/MISSION.md`, prompts for goal/scope.                     |

Also: read [`AGENTS.md`](../AGENTS.md) once per session and identify yourself from your CWD. (Template: [`AGENTS.template.md`](./AGENTS.template.md).)

---

## Step 3 — Principles (commit these to memory)

- **Append-only.** Never edit a file. Create a new timestamped sibling. Retire via a `<stem>.superseded.md` tombstone.
- **Read the snapshot, not the digest.** Latest `orchestrator/<file>.md` is your session-start checkpoint. Digest is for deep audits.
- **`summary:` required** on every agent-targeted file (one sentence, ≤30 words). Powers `_index.md`.
- **Default skip** `status: superseded` and tombstoned files in Quick resume / Catch up. `/audit` is the only mode that reads them.
- **Soft budget ≈ 5k tokens** before doing real work. Slash commands respect this.
- **Latest wins by filename sort.** ISO timestamps in filenames; never sort by mtime.
- **One change → one file.** Don't bundle multiple concerns into a single log entry — keeps the feed grep-able.
- **Never write into another repo's `repos/<them>/`.** Use a `log/` entry with `to: [<them>]`.
- **Every contract change ships with `kind: contract-change`. Every direction change ships with `kind: pivot`.**

---

## Step 4 — Full protocol reference

### 4.1 Folder map

```
shared-context/
├── README.md                       ← repo intro (this team's setup)
├── AGENTS.md                       ← repo identity roster (per-team)
├── dashboard.html                  ← generated; cross-feature human view
├── framework/                      ← the shareable framework (this folder)
│   ├── README.md                   ← agent protocol (this file)
│   ├── CONVENTIONS.md              ← Mission Control conventions
│   ├── QUICKSTART.md               ← human-facing setup
│   ├── AGENTS.template.md          ← roster template
│   ├── commands/                   ← slash command source (symlinked into ~/.claude/commands/)
│   ├── orchestrator/brief.md       ← orchestrator agent role definition
│   ├── bin/                        ← render script + hook entrypoints
│   ├── templates/MISSION.md        ← per-feature mission template
│   └── examples/sample-feature/    ← worked end-to-end example
└── features/<slug>/
    ├── MISSION.md                 ← feature identity (static, near-zero edits)
    ├── _index.md                  ← generated; agent skim layer
    ├── orchestrator/              ← orchestrator snapshots (append-only)
    ├── overview/                  ← feature goal/scope snapshots
    ├── repos/<repo>/              ← per-repo self-authored status snapshots
    ├── contracts/<api>/           ← versioned API contracts (source of truth)
    ├── decisions/                 ← ADRs
    ├── digest/                    ← deep-audit checkpoints
    ├── log/                       ← chronological cross-repo messages
    └── cursors/<repo>/            ← per-repo "what I've read" bookmark
```

Write rules:

| Folder              | Who writes                                | When                                              |
|---------------------|-------------------------------------------|---------------------------------------------------|
| `overview/`         | Whoever scoped the feature                | At creation; rare amendments                      |
| `repos/<self>/`     | Only the owning repo                      | When that repo's status changes                   |
| `repos/<other>/`    | **Never.** Use `log/` with `to:` instead. | —                                                 |
| `contracts/<api>/`  | The repo that owns the API surface        | On every API change (new version)                 |
| `decisions/`        | Anyone                                    | When a non-obvious choice is made                 |
| `digest/`           | Anyone                                    | Session end, or every ~10 log entries             |
| `log/`              | Everyone, append-only                     | On every meaningful change or ask                 |
| `cursors/<self>/`   | Only the owning repo                      | At session end (or before compaction)             |
| `orchestrator/`     | The `orchestrator` identity only          | Triggered by digest writes; or `/refresh` / `/bootstrap` |

### 4.2 File naming

```
YYYY-MM-DDTHH-MM-SS-<repo>[-<slug>].md
```

- UTC. Get it with `date -u +"%Y-%m-%dT%H-%M-%S"`.
- `<repo>` is your identity from `AGENTS.md`.
- `<slug>` is optional kebab-case.
- **Decisions** drop the `<repo>` prefix (feature-level, not repo-level).
- **Tombstones** are `<original-stem>.superseded.md`.

### 4.3 Session protocol

**Soft budget: ≤ 5k tokens** of context load before real work. Default skip rule applies in all modes except Full audit: ignore `status: superseded` and tombstoned files.

#### Quick resume (`/resume`)
1. `features/<f>/MISSION.md`
2. `features/<f>/orchestrator/` — latest file. **Your checkpoint.** Treat as having absorbed everything older than its `at:`.
3. `features/<f>/log/` — pivots newer than the snapshot.
4. `features/<f>/repos/<self>/` — latest file.
5. `features/<f>/log/` — entries `to:` you, newer than the snapshot.

Fall back to latest `digest/` if no orchestrator snapshot exists yet.

#### Catch up (`/catch-up`)
Quick resume, plus:
6. `features/<f>/_index.md` — agent skim layer.
7. `features/<f>/cursors/<self>/` — latest.
8. `features/<f>/contracts/<api>/` — latest per API you'll touch (skip superseded).
9. `features/<f>/decisions/` — newer than cursor's `last_decision_read`, status `accepted`.
10. `features/<f>/log/` — newer than max(snapshot's `at`, cursor's `last_log_read`).

#### Full audit (`/audit`)
Catch up + every log/decision/contract since cursor regardless of `to:` filter, **including superseded**. Use sparingly.

#### During work

| What happened                                | Write where                                                       |
|----------------------------------------------|-------------------------------------------------------------------|
| Code change others should know about         | `log/` (`kind: change` or `fyi`)                                  |
| Changed/added an API surface                 | New `contracts/<api>/<version>.md` + `log/` (`kind: contract-change`) |
| Non-obvious design choice                    | New `decisions/` file + `log/` (`kind: decision`)                 |
| Need something from another repo             | `log/` (`kind: ask`, `to: [<repo>]`)                              |
| Answering an ask directed at you             | `log/` (`kind: answer`, `refs: [<ask-filename>]`)                 |
| Direction is changing                        | `/pivot` — drops `kind: pivot` log + tombstones + fresh digest    |
| Your repo's status changed                   | New file in `repos/<self>/`                                       |
| Want a checkpoint                            | New file in `digest/` (triggers orchestrator + index regen)       |

#### Session end (`/handoff`)

1. Fresh digest if stale (no digest yet, >10 log entries since last, or substantial progress).
2. Fresh cursor.

### 4.4 Frontmatter standards

Every file under a feature folder begins with YAML frontmatter. **`summary:` is required** on every agent-targeted file (≤30 words). Renderer falls back to first H1 / first sentence if absent.

#### log entry
```yaml
---
type: log
kind: change | ask | answer | contract-change | decision | fyi | blocker | pivot
from: <repo>
at: 2026-05-15T14:23:00Z
to: [<repo>, <repo>]                # or [all]
summary: One sentence — what changed and who it affects.
refs: [contracts/auth-api/2026-05-15T14-23-00-backend-v0.3.0.md]
supersedes: all-prior               # kind: pivot only. Either `all-prior` or a list.
---
```

#### contract version
```yaml
---
type: contract
name: auth-api
version: 0.3.0
author: <repo>
at: 2026-05-15T14:23:00Z
summary: One sentence — what this version adds or changes.
supersedes: 2026-05-13T10-00-00-backend-v0.2.0.md
consumers: [frontend, mobile]
breaking: false
status: active | superseded         # default active; flip via tombstone.
---
```

#### decision (ADR)
```yaml
---
type: decision
title: Use JWT for stateless auth
author: <repo>
at: 2026-05-15T14:23:00Z
summary: One sentence — the rule and its scope.
status: proposed | accepted | superseded
affects: [auth-api]
---
```

#### tombstone (lifecycle marker)
Filename: `<original-stem>.superseded.md`. Retires a sibling without editing it.
```yaml
---
type: tombstone
original: 2026-05-13T10-00-00-use-jwt.md
superseded_by: 2026-05-20T09-00-00-use-paseto.md
at: 2026-05-20T09:00:00Z
---
```

#### repo status
```yaml
---
type: status
repo: <repo>
at: 2026-05-15T14:23:00Z
summary: One sentence — where this repo stands.
---
```

#### digest
```yaml
---
type: digest
author: <repo>
at: 2026-05-15T14:30:00Z
summary: One sentence — state of the feature at this checkpoint.
---
```

#### cursor
```yaml
---
type: cursor
repo: <repo>
at: 2026-05-15T14:50:00Z
last_checkpoint_read: 2026-05-15T14-30-00-orchestrator.md
last_log_read: 2026-05-15T14-45-12-frontend.md
last_pivot_read: null
contracts_synced:
  auth-api: 2026-05-15T14-23-00-backend-v0.3.0.md
last_decision_read: 2026-05-15T14-23-00-use-jwt.md
---
```

#### overview
```yaml
---
type: overview
author: <repo>
at: 2026-05-15T14:00:00Z
status: active | paused | done
summary: One sentence — the feature in plain language.
---
```

### 4.5 Anti-patterns

- ❌ Editing an existing file. Always create a new timestamped sibling.
- ❌ Writing into another repo's `repos/<them>/` folder. Use a `log/` entry with `to: [<them>]`.
- ❌ Changing a contract without a `kind: contract-change` log — others won't know to re-sync.
- ❌ Sorting by mtime. Clock skew makes mtime unreliable — sort by filename.
- ❌ Local-time timestamps. Always UTC.
- ❌ Bundling multiple concerns into one log entry.
- ❌ Stopping without a fresh digest when the latest is stale. Next agent pays the cost.
- ❌ Greedy-reading the full log when an orchestrator snapshot exists.
- ❌ Changing direction without `/pivot`. Anything not pivot-marked is assumed still active.
- ❌ Skipping the cursor write at session end.
- ❌ Editing or deleting a superseded entry. Use a `*.superseded.md` tombstone.

### 4.6 Bootstrap a new feature

Use `/bootstrap <slug>` from any session. It runs the equivalent of:

```bash
SLUG=<feature-slug>
mkdir -p features/$SLUG/{overview,repos,contracts,decisions,digest,log,cursors,orchestrator}
cp templates/MISSION.md features/$SLUG/MISSION.md
```

…then walks you through goal/scope, writes the first `overview/` and a starter `repos/<self>/`, and asks the orchestrator to write the first snapshot.
