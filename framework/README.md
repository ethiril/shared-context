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
  "PreToolUse": [
    {
      "matcher": "Write",
      "hooks": [
        { "type": "command", "command": "<SHARED_CONTEXT_ROOT>/framework/bin/hook-lint.sh" }
      ]
    }
  ],
  "PostToolUse": [
    {
      "matcher": "Write|Edit",
      "hooks": [
        { "type": "command", "command": "<SHARED_CONTEXT_ROOT>/framework/bin/hook-render.sh" }
      ]
    }
  ]
}
```

Two cheap hooks, no LLM cost:

- **`hook-lint.sh`** (PreToolUse, Write only) — checks new files under `features/<slug>/` against the per-artifact word budgets in CONVENTIONS.md and the AGENTS.md identity roster. Warns to stderr by default. Set `SHARED_CONTEXT_LINT_MODE=block` to make violations block the write (the message lands as a system reminder so the agent can re-plan). Opt out per file with `# allow-oversize: <reason>` as the first body line.
- **`hook-render.sh`** (PostToolUse, Write+Edit) — re-renders `dashboard.html` from raw state. Pure aggregation.

**No third hook by default** — orchestrator snapshots are command-triggered (`/refresh`), not automatic. This keeps the human in the loop on synthesis and avoids paying for headless LLM round-trips you didn't ask for.

Restart any open Claude Code sessions to pick up new commands. Open `dashboard.html` to see the result.

> **Opt-in: auto-orchestrate.** If you want a fresh snapshot every time a digest lands (the old behaviour), add a third hook entry pointing at `framework/bin/hook-orchestrate.sh` under PostToolUse. It runs the orchestrator headlessly via `claude -p` per digest write. Skipping it (the default) means `dashboard.html` still updates from raw state, but synthesised snapshots only refresh when you run `/refresh <feature>`.

---

## Step 2 — Daily loop

Nine slash commands cover everything. Argument is the feature slug.

| Command                                | When                                                | What                                                                                          |
|----------------------------------------|-----------------------------------------------------|-----------------------------------------------------------------------------------------------|
| `/resume <feature>`                    | First message after `/clear`.                       | Reads MISSION + latest orchestrator snapshot + your inbox. ~5k tokens.                        |
| `/catch-up <feature>`                  | New session or back after a break.                  | `/resume` + `_index.md` skim + recent decisions/contracts.                                    |
| `/check-in <feature>`                  | Mid-session: the other repo just sent you something.| Reads only your inbox; reports a table; **pauses for go-ahead** before acking.                |
| `/audit <feature>`                     | Verify history; something looks wrong.              | Full read, including superseded. Ignores the token budget.                                    |
| `/handoff <feature>`                   | Before `/clear`. Leave a clean checkpoint.          | Writes digest + cursor. Digest triggers orchestrator refresh.                                 |
| `/pivot <feature> <reason>`            | Direction is changing.                              | Drops `kind: pivot` log + tombstones for retired items + fresh digest.                        |
| `/refresh <feature>`                   | Update the human dashboard now.                     | **Primary orchestrator entry.** Rebuilds the snapshot + `dashboard.html` + `_index.md` in your current session. Asks you tight yes/no questions on MISSION amendments, contract tombstones, etc. |
| `/bootstrap <feature>`                 | Starting a new feature.                             | Scaffolds folders, copies `templates/MISSION.md`, prompts for goal/scope.                     |
| `/close-project <feature> [done\|paused]` | Wrapping up: shipped, or parking the feature.    | Flips `MISSION.md` status + writes a closing digest. Dashboard archives the feature.          |

Also: read [`AGENTS.md`](../AGENTS.md) once per session and identify yourself from your CWD. (Template: [`AGENTS.template.md`](./AGENTS.template.md).)

---

## Step 3 — Principles (commit these to memory)

- **Append-only.** Never edit a file. Create a new timestamped sibling. Retire via a `<stem>.superseded.md` tombstone. Exceptions: `MISSION.md` (amendments), `cursors/<self>/current.md` (rolling, owner-only), `tickets/<slug>.md` (edit-in-place, see §4.4), `_index.md` + `dashboard.html` (generated).
- **Read the snapshot, not the digest.** Latest `orchestrator/<file>.md` is your session-start checkpoint. Digest is for deep audits.
- **`summary:` required** on every agent-targeted file (one sentence, ≤30 words). Powers `_index.md`.
- **Default skip** `status: superseded`, tombstoned files, and `*.skipped.md` in Quick resume / Catch up. `/audit` is the only mode that reads them.
- **Soft budget ≈ 5k tokens** before doing real work. Slash commands respect this.
- **Latest wins by filename sort.** ISO timestamps in filenames; never sort by mtime.
- **One change → one file.** Don't bundle multiple concerns into a single log entry — keeps the feed grep-able.
- **Never write into another repo's `repos/<them>/`.** Use a `log/` entry with `to: [<them>]`.
- **Every contract change ships with `kind: contract-change`. Every direction change ships with `kind: pivot`.**
- **One ticket, one location.** Cross-repo work goes in `tickets/<slug>.md` and is `refs:`-pointed from logs. Don't duplicate ticket bodies into multiple log entries or repo doc folders.

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
    ├── tickets/                   ← single-source-of-truth cross-repo tickets (edit-in-place)
    └── cursors/<repo>/            ← per-repo "what I've read" bookmark
                                     (current.md = rolling; older timestamped files are history)
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
| `tickets/`          | The repo owning the work (or orchestrator) | Whenever work is scoped that spans repos or needs a long-form spec. Edited in place. |
| `cursors/<self>/`   | Only the owning repo                      | At session end (rolling `current.md`)             |
| `orchestrator/`     | The `orchestrator` identity only          | `/refresh <slug>` (default) or the opt-in digest hook |

### 4.2 File naming

```
YYYY-MM-DDTHH-MM-SS-<repo>[-<slug>].md
```

- UTC. Get it with `date -u +"%Y-%m-%dT%H-%M-%S"`.
- `<repo>` is your identity from `AGENTS.md`.
- `<slug>` is optional kebab-case.
- **Decisions** drop the `<repo>` prefix (feature-level, not repo-level).
- **Tombstones (lifecycle markers)** come in two variants:
  - `<original-stem>.superseded.md` — retires a sibling that was replaced by a newer artifact.
  - `<iso>-<author>-v<version>.skipped.md` — a contract version that was discussed and *consciously not published*. Standalone file (no parent). See §4.4.
- **Tickets** use `<kebab-slug>.md` (no timestamp prefix — they're edit-in-place, not append).
- **Rolling cursor** is `cursors/<repo>/current.md`. Older timestamped cursor files are left as history.

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
| Need something from another repo             | `log/` (`kind: ask`, `to: [<repo>]`) — blocking; expects a substantive answer |
| Open-ended discussion, not blocking          | `log/` (`kind: question`, `to: [<repo>]`) — non-blocking conversational sibling of `ask` |
| Answering an ask or question directed at you | `log/` (`kind: answer`, `refs: [<inbound-filename>]`)             |
| Scoped cross-repo work that needs a spec     | New `tickets/<slug>.md` + `log/` (`kind: ticket`, `refs: [tickets/<slug>.md]`) |
| Updating an existing ticket                  | Edit `tickets/<slug>.md` in place + `log/` (`kind: ticket-update`, `refs: [tickets/<slug>.md]`) |
| Contract version discussed and declined      | `contracts/<api>/<iso>-<author>-v<version>.skipped.md` + `log/` explaining why |
| Direction is changing                        | `/pivot` — drops `kind: pivot` log + tombstones + fresh digest    |
| Your repo's status changed                   | New file in `repos/<self>/`                                       |
| Want a checkpoint                            | New file in `digest/`                                             |
| Want the dashboard re-synthesised            | `/refresh <slug>` (writes a fresh orchestrator snapshot)          |

#### Session end (`/handoff`)

1. Fresh digest if stale (no digest yet, >10 log entries since last, or substantial progress).
2. Update `cursors/<self>/current.md` (rolling — overwrite in place).

### 4.4 Frontmatter standards

Every file under a feature folder begins with YAML frontmatter. **`summary:` is required** on every agent-targeted file (≤30 words). Renderer falls back to first H1 / first sentence if absent.

#### log entry
```yaml
---
type: log
kind: change | ask | question | answer | contract-change | decision | fyi | blocker | pivot | ticket | ticket-update
from: <repo>
at: 2026-05-15T14:23:00Z
to: [<repo>, <repo>]                # or [all]
summary: One sentence — what changed and who it affects.
refs: [contracts/auth-api/2026-05-15T14-23-00-backend-v0.3.0.md]
supersedes: all-prior               # kind: pivot only. Either `all-prior` or a list.
---
```

`kind` distinctions worth noting:
- **`ask`** — blocking. The asker can't proceed without a substantive answer. Show up at the top of the inbox.
- **`question`** — non-blocking. "While you're here, what do you think about X?" Discuss when convenient.
- **`ticket`** — first time a `tickets/<slug>.md` is announced. Subsequent edits use `ticket-update`.

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
Two variants:

**Superseded** — retires a sibling that was replaced. Filename: `<original-stem>.superseded.md`.
```yaml
---
type: tombstone
variant: superseded                   # default; may be omitted
original: 2026-05-13T10-00-00-use-jwt.md
superseded_by: 2026-05-20T09-00-00-use-paseto.md
at: 2026-05-20T09:00:00Z
---
```

**Skipped** — a contract version that was discussed and consciously *not published*. Standalone file (no parent). Filename: `<iso>-<author>-v<version>.skipped.md` under `contracts/<api>/`.
```yaml
---
type: tombstone
variant: skipped
contract: vouchers-api
version: 1.0.2
declined_by: log/2026-05-15T22-06-40-subscriptions-gateway-change-architecture.md
at: 2026-05-15T22:06:40Z
reason: One sentence — why this version was discussed and not written.
---
```

Reach for `skipped` when an agent or human raised a version, the team decided not to publish it (or to fold it into a later version), and you want future agents to see the breadcrumb instead of re-litigating.

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
**Rolling** — write to `cursors/<repo>/current.md` and overwrite each session-end. Older timestamped files (from prior sessions, before this convention) stay as history but are ignored by Quick resume / Catch up.
```yaml
---
type: cursor
repo: <repo>
at: 2026-05-15T14:50:00Z              # last write
last_checkpoint_read: 2026-05-15T14-30-00-orchestrator.md
last_log_read: 2026-05-15T14-45-12-frontend.md
last_pivot_read: null
contracts_synced:
  auth-api: 2026-05-15T14-23-00-backend-v0.3.0.md
last_decision_read: 2026-05-15T14-23-00-use-jwt.md
---
One-line note. What you'd want next-session-you to remember in five words.
```

#### ticket
Filename: `tickets/<kebab-slug>.md`. Edit-in-place. The single source of truth for cross-repo work that would otherwise get duplicated across log entries and per-repo docs folders.
```yaml
---
type: ticket
slug: flutter-voucher-migration
title: Flutter voucher migration — swap Firebase RC for /vouchers/validate
author: <repo who scoped it>
assignee: <repo who executes>          # or [<repo>, <repo>] for shared work
at: 2026-05-15T14:23:00Z               # original creation
last_updated: 2026-05-16T01:00:00Z     # bumped on every edit
status: open | in-progress | done | cancelled
summary: One sentence — what the ticket asks for.
refs:
  - contracts/vouchers-api/2026-05-15T15-56-43-app-gateway-v1.0.1.md
---
```
Body is as long as the spec needs (not linted). Logs reference it via `refs: [tickets/<slug>.md]` and `kind: ticket` (announcement) / `kind: ticket-update` (progress). Don't paste ticket content into log bodies — refs it.

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

- ❌ Editing an existing file — **except** `MISSION.md` (amendments), `cursors/<self>/current.md` (rolling), `tickets/<slug>.md` (edit-in-place), and the generated `_index.md` / `dashboard.html`. Everywhere else: create a new timestamped sibling.
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
- ❌ Pasting long-form ticket content into a log entry. Write it once into `tickets/<slug>.md` and `refs:` it.

### 4.6 Bootstrap a new feature

Use `/bootstrap <slug>` from any session. It runs the equivalent of:

```bash
SLUG=<feature-slug>
mkdir -p features/$SLUG/{overview,repos,contracts,decisions,digest,log,tickets,cursors,orchestrator}
cp templates/MISSION.md features/$SLUG/MISSION.md
```

…then walks you through goal/scope, writes the first `overview/` and a starter `repos/<self>/`, and asks the orchestrator to write the first snapshot.
