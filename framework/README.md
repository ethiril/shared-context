# shared-context — agent protocol

> You are an agent. This is the file you act on. The top-level `README.md` is human onboarding — ignore it.

Multi-repo coordination via timestamped, append-only files under `features/<slug>/`. Latest orchestrator snapshot is your session-start checkpoint; logs/contracts/decisions are the source of truth.

---

## 1. Identify yourself

1. Open [`AGENTS.md`](../AGENTS.md). Find the row whose CWD matches yours. That row's `Repo identity` (kebab-case) is your `<repo>` value in every filename and frontmatter `from:` / `author:` field.
2. If no row matches, stop and ask the human to add one — don't invent an identity.
3. If your CWD is the shared-context repo root, identity depends on **work mode**, not the directory: `orchestrator` for synthesis passes (e.g. `/refresh`) — read [`orchestrator/brief.md`](./orchestrator/brief.md) instead of continuing here. `framework` for framework-maintenance work (docs, scripts, slash commands, templates) — continue with this protocol as a normal repo identity.

---

## 2. Resume the feature (≤ 5k tokens before real work)

### Quick resume (`/resume <slug>`)

Read in this order, stop when you have enough:

1. `features/<slug>/MISSION.md` — feature identity.
2. `features/<slug>/orchestrator/` — newest file. **Treat as having absorbed everything older than its `at:`.** This is your checkpoint.
3. `features/<slug>/log/` — entries with `kind: pivot` newer than the snapshot.
4. `features/<slug>/repos/<self>/` — newest file.
5. `features/<slug>/log/` — entries with `to:` containing your identity, newer than the snapshot.

Fall back to newest `digest/` if no orchestrator snapshot exists.

### Catch up (`/catch-up <slug>`)

Quick resume, then:

6. `features/<slug>/_index.md` — the generated skim layer.
7. `features/<slug>/cursors/<self>/current.md` — your bookmark.
8. `features/<slug>/contracts/<api>/` — newest per API you'll touch (skip `*.superseded.md`).
9. `features/<slug>/decisions/` — newer than cursor's `last_decision_read`, status `accepted`.
10. `features/<slug>/log/` — newer than max(snapshot's `at:`, cursor's `last_log_read`).

### Full audit (`/audit <slug>`)

Catch up + every log/decision/contract since cursor regardless of `to:` filter, **including superseded and `.skipped.md`**. Ignores the 5k budget. Use sparingly.

### Session end (`/handoff <slug>`)

1. Write a fresh `digest/` if stale (no digest yet, > 10 log entries since last, or substantial progress this session).
2. Overwrite `cursors/<self>/current.md` with bookmarks against the latest snapshot, log, pivot, contracts you touched, and decision you read.

### Default skips (every mode except `/audit`)

`status: superseded`, files with a `*.superseded.md` sibling, `*.skipped.md`.

### Sort rule

Always sort by **filename**, not mtime. Filenames are UTC ISO timestamps; mtime is clock-skew-prone.

---

## 3. Folder map + write rules

```
features/<slug>/
├── MISSION.md          static; human-authored at bootstrap, append-only `## Amendments` for scope changes
├── _index.md           generated; do not write
├── orchestrator/       orchestrator-only; you never write here
├── overview/           feature goal/scope snapshots
├── repos/<repo>/       per-repo status; only the owning repo writes its own folder
├── contracts/<api>/    versioned API surfaces; written by the API's owning repo
├── decisions/          ADRs (any repo)
├── digest/             deep checkpoints (any repo; session-end or every ~10 log entries)
├── log/                cross-repo messages (every repo)
├── tickets/<slug>.md   single-source-of-truth long-form work specs (edit-in-place)
└── cursors/<repo>/     your bookmark; `current.md` rolls in place, owner-only
```

| Folder              | Who writes                                | When                                                            |
|---------------------|-------------------------------------------|-----------------------------------------------------------------|
| `overview/`         | Whoever scoped the feature                | At creation; rare amendments                                    |
| `repos/<self>/`     | Only the owning repo                      | When your repo's status changes                                 |
| `repos/<other>/`    | **Never.** Use `log/` with `to:` instead. | —                                                               |
| `contracts/<api>/`  | The repo that owns the API surface        | On every API change (new version)                               |
| `decisions/`        | Anyone                                    | When a non-obvious choice is made                               |
| `digest/`           | Anyone                                    | Session end, or every ~10 log entries                           |
| `log/`              | Everyone                                  | On every meaningful change or ask                               |
| `tickets/`          | The repo owning the work                  | Cross-repo work that needs a long-form spec; edited in place    |
| `cursors/<self>/`   | Only the owning repo                      | At session end (rolling `current.md`)                           |
| `orchestrator/`     | The `orchestrator` identity only          | `/refresh <slug>` (default) or the opt-in digest hook           |

---

## 4. Slash commands

| Command                                | When                                              | What it does                                                                                              |
|----------------------------------------|---------------------------------------------------|-----------------------------------------------------------------------------------------------------------|
| `/resume <slug>`                       | First message after `/clear`                      | MISSION + latest snapshot + your inbox (~5k tokens)                                                       |
| `/catch-up <slug>`                     | New session or back after a break                 | `/resume` + `_index.md` + recent decisions/contracts                                                      |
| `/check-in <slug>`                     | Mid-session: someone just sent you something      | Reads only your inbox; reports a table; **pauses for go-ahead** before acking                             |
| `/audit <slug>`                        | Verify history; something looks wrong             | Full read incl. superseded. Ignores the 5k budget                                                          |
| `/handoff <slug>`                      | Before `/clear`                                   | Writes digest + cursor                                                                                     |
| `/pivot <slug> <reason>`               | Direction changing                                | `kind: pivot` log + tombstones for retired items + fresh digest                                            |
| `/refresh <slug>`                      | Update the human dashboard now                    | Rebuilds orchestrator snapshot + `dashboard.html` + `_index.md`. May ask tight yes/no questions inline.   |
| `/bootstrap <slug>`                    | Starting a new feature                            | Scaffolds folders, copies `templates/MISSION.md`, prompts for goal/scope                                  |
| `/close-project <slug> [done\|paused]` | Wrapping up                                       | Flips `MISSION.md` status + closing digest. Dashboard archives the feature.                                |

---

## 5. What to write where (during work)

| What happened                                | Write where                                                                                        |
|----------------------------------------------|----------------------------------------------------------------------------------------------------|
| Code change others should know about         | Append line to `log/log.dsl` (`[kind]` = `ch` or `fy`)                                              |
| Changed/added an API surface                 | New `contracts/<api>/<iso>-<repo>-v<version>.dsl` + append to `log/log.dsl` (`[cc]`)                |
| Non-obvious design choice                    | New `decisions/<iso>-<title>.md` + append to `log/log.dsl` (`[ch]` or `[fy]` referencing it)        |
| Need something from another repo (blocking)  | Append to `log/log.dsl` (`[q]`, `from > <repo>`)                                                    |
| Open-ended discussion, not blocking          | Append to `log/log.dsl` (`[q]`, non-blocking by tone)                                               |
| Answering an inbound `ask`/`question`        | Append to `log/log.dsl` (`[a]`, `refs: <inbound-line-timestamp>`)                                   |
| Scoped cross-repo work needing a spec        | New `tickets/<kebab-slug>.md` + append to `log/log.dsl` (`[tk]`, `refs: tickets/<slug>.md`)         |
| Updating an existing ticket                  | Edit `tickets/<slug>.md` in place + append to `log/log.dsl` (`[tk]`)                                |
| Contract version discussed and declined      | `contracts/<api>/<iso>-<repo>-v<version>.skipped.md` (YAML tombstone) + log entry explaining why    |
| Direction is changing                        | `/pivot <slug> <reason>` — writes `[pv]` line with `supersedes:`                                    |
| Your repo's status changed                   | New `repos/<self>/<iso>.positional`                                                                 |
| Want a checkpoint                            | New `digest/<iso>-<repo>.md` (YAML+body, see §7)                                                    |
| Want the dashboard re-synthesised            | `/refresh <slug>`                                                                                   |

Single-concern rule: one change → one file. Don't bundle.

---

## 6. File naming

Default for YAML-frontmatter artefacts:

```
YYYY-MM-DDTHH-MM-SS-<repo>[-<slug>].md
```

- UTC. Get it with `date -u +"%Y-%m-%dT%H-%M-%S"`.
- `<repo>` is your identity from `AGENTS.md`.
- `<slug>` is optional kebab-case (the topic of the file, not the feature).
- **Decisions** drop the `<repo>` prefix (feature-level, not repo-level): `<iso>-<title>.md`.
- **Tombstones:**
  - `<original-stem>.superseded.md` — retires a sibling.
  - `<iso>-<repo>-v<version>.skipped.md` — contract version discussed and not published (standalone).
- **Tickets:** `<kebab-slug>.md` (no timestamp; edit-in-place).
- **Rolling cursor:** `cursors/<repo>/current.md` (overwrite each session).

Compact-format artefacts (see §7):

- **Log entries:** `features/<slug>/log/log.dsl` — single rolling file per feature; append-only.
- **Repo statuses:** `features/<slug>/repos/<repo>/<iso>.positional` — one file per status snapshot.
- **Contract versions:** `features/<slug>/contracts/<api>/<iso>-<repo>-v<X.Y.Z>.dsl` — one file per version.

---

## 7. Artefact formats

`summary:` is **required** on every agent-targeted file. One sentence, ≤ 30 words. Feeds `_index.md`.

**Three artefacts use compact line-based formats** (chosen by `agent-format-pass` + `agent-format-pass-v2` measurement + 3-tier parse-reliability sweep): `log/`, `repos/`, `contracts/`. **The rest use YAML frontmatter** (with optional body). Compact formats inline a legend reference at the top of this section so readers/writers don't need to look anywhere else.

Legacy md+YAML files of any artefact type are still parsed by the renderer indefinitely — agents only need to use the new shapes on **new** writes.

### log entries — DSL, rolling single-file per feature

Path: `features/<slug>/log/log.dsl`. **Append a single line per event.** One file per feature, not one file per entry.

Grammar (one line per event):

```
from > to [kind] @at: summary | refs: r1,r2 | body...
```

- `from` — repo identifier.
- `to` — repo identifier OR `all` OR comma-separated list (e.g. `worker,mobile`).
- `kind` — one of: `cc` (contract-change), `q` (question), `a` (answer), `fy` (fyi), `bl` (blocker), `pv` (pivot), `ch` (change), `ak` (ack), `tk` (ticket-update).
- `@at` — ISO timestamp with colons (UTC). Legacy alternative: `[at]` as a leading prefix; the parser accepts both.
- `summary` — required; ≤ 30 words.
- `refs:` — optional; comma-separated paths.
- `body` — free-form prose after the final `|`. Pipe-escape (`\|`) any embedded `|`.

For `kind: pv` (pivot): include `supersedes: all-prior` (or a comma-separated list of timestamps) as a labelled section before `body`.

Example:

```
api > worker [cc] @2026-05-15T14:23:00Z: POST /signup now enqueues welcome-email-job v1.0.0 | refs: contracts/auth-api/2026-05-15T14-23-00-backend-v0.3.0.dsl, decisions/2026-05-15T14-00-00-fire-and-forget.md | POST /signup enqueues a welcome-email job after the user row commits. Fire-and-forget — no retry, no callback. @worker: please confirm dequeue.
```

`kind` distinctions:
- `ask` (use `q`) is **blocking**; the asker can't proceed without a substantive `answer` (`a`).
- `question` (also `q`) is non-blocking; "while you're here…".
- `ticket` first announcement uses `tk` and points at `tickets/<slug>.md` in refs; subsequent updates use `tk` too.

Append-only. Tombstoning a single line is not supported — pivots use `supersedes` to retire prior lines.

### contract versions — DSL, one file per version

Path: `features/<slug>/contracts/<api>/<iso>-<repo>-v<X.Y.Z>.dsl`.

Grammar:

```
name@version [status] @at by <author>: summary | consumers: r1,r2 | breaking: true|false | queue: name=<n> backend=<b> vt=<seconds>s | payload: f1(type;req?;notes); f2(...); ... | producer: <p> | consumer: <c> | coupling: <c>
```

`@at` is optional (filename usually carries the timestamp). Sections after `summary` are optional and order-independent; include only those that apply. `payload:` items use `field(type;req|opt;notes)` triplets; semicolons separate fields.

Example:

```
welcome-email-job@1.0.0 [active] @2026-05-15T14:23:00Z by api: v1 job schema — userId, email, locale | consumers: worker | breaking: false | queue: name=welcome-emails backend=Redis-bull vt=30s | payload: userId(string;req;UUIDv4/ULID); email(string;req;RFC5322); locale(string;req;BCP-47) | producer: API enqueues exactly once per signup | consumer: Worker idempotent if retry added v2 | coupling: fire-and-forget
```

Supersession is via `<api>/<original-stem>.superseded.md` sibling tombstone (still YAML, see below).

### repo status — positional record, one file per snapshot

Path: `features/<slug>/repos/<repo>/<iso>.positional`. Single line per file.

Schema (field separator `|`; multi-value separator `~`; embedded `|` escaped as `\|`):

```
repo|at|summary|current_goal|done|next|blocked_on|contracts_in_play|open_questions
```

- `done`, `next`, `blocked_on` are `~`-separated string lists.
- `contracts_in_play` and `open_questions` are **inline JSON** (the only nested fields — JSON keeps them parseable without inventing a sub-grammar).

Example:

```
api|2026-05-15T14:23:00Z|v1 enqueue shipped on main; awaiting worker ack|Enqueue a welcome-email job on every signup|POST /signup enqueues against welcome-email-job v1.0.0~ADR for fire-and-forget published~Unit + integration tests green|Joint staging signup test once worker confirms~Nothing else for v1||[{"name":"welcome-email-job","version":"1.0.0","role":"owner","consumer":"worker"}]|[{"to":"worker","ask":"confirm consumer wired and non-en locales fall through cleanly"}]
```

### contract version (legacy md+YAML — still readable, do not write new)

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
status: active | superseded
---
```

### decision (ADR)

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

### tombstone — superseded

Filename: `<original-stem>.superseded.md`. Body empty.

```yaml
---
type: tombstone
variant: superseded                   # default; may be omitted
original: 2026-05-13T10-00-00-use-jwt.md
superseded_by: 2026-05-20T09-00-00-use-paseto.md
at: 2026-05-20T09:00:00Z
---
```

### tombstone — skipped

Filename: `<iso>-<repo>-v<version>.skipped.md` under `contracts/<api>/`. Standalone (no parent).

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

Reach for `skipped` when a version was raised, the team decided not to publish it, and future agents would benefit from the breadcrumb.

### digest

```yaml
---
type: digest
author: <repo>
at: 2026-05-15T14:30:00Z
summary: One sentence — state of the feature at this checkpoint.
---
```

### cursor (rolling — `cursors/<repo>/current.md`)

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
One-line note: what would you want next-session-you to remember in five words.
```

### ticket

Filename: `tickets/<kebab-slug>.md`. Edit-in-place. The single source of truth for cross-repo work that would otherwise duplicate across logs and per-repo docs.

```yaml
---
type: ticket
slug: flutter-voucher-migration
title: Flutter voucher migration — swap Firebase RC for /vouchers/validate
author: <repo-who-scoped-it>
assignee: <repo-who-executes>         # or [<repo>, <repo>]
at: 2026-05-15T14:23:00Z              # creation
last_updated: 2026-05-16T01:00:00Z    # bump on every edit
status: open | in-progress | done | cancelled
summary: One sentence — what the ticket asks for.
refs: [contracts/vouchers-api/2026-05-15T15-56-43-app-gateway-v1.0.1.md]
---
```

Body is as long as the spec needs (not linted). Logs reference it via `refs: [tickets/<slug>.md]`. Don't paste ticket content into log bodies.

### overview

```yaml
---
type: overview
author: <repo>
at: 2026-05-15T14:00:00Z
status: active | paused | done
summary: One sentence — the feature in plain language.
---
```

---

## 8. Principles (commit these to memory)

- **Append-only.** Never edit. Create a new timestamped sibling. Retire via `<stem>.superseded.md`. Edit-in-place exceptions: `MISSION.md` (amendments), `cursors/<self>/current.md` (rolling), `tickets/<slug>.md`, generated files.
- **Read the snapshot, not the digest.** Latest `orchestrator/<file>.md` is your checkpoint. Digest is for deep audits.
- **`summary:` required** on every agent-targeted file (≤ 30 words). Powers `_index.md`.
- **Default skip** `status: superseded`, tombstoned files, and `*.skipped.md` in resume/catch-up. Only `/audit` reads them.
- **One change → one file.** Don't bundle.
- **Never write another repo's `repos/<them>/`.** Use a `log/` entry with `to: [<them>]`.
- **Every contract change ships with `kind: contract-change`. Every direction change ships with `kind: pivot`.**
- **One ticket, one location.** Cross-repo specs go in `tickets/<slug>.md` and are `refs:`-pointed from logs.
- **Latest wins by filename sort.** ISO timestamps in filenames; never sort by mtime.

---

## 9. Anti-patterns

- ❌ Editing existing files outside the explicit exceptions above.
- ❌ Writing into another repo's `repos/<them>/`.
- ❌ Changing a contract without a `kind: contract-change` log.
- ❌ Sorting by mtime.
- ❌ Local-time timestamps.
- ❌ Bundling multiple concerns into one log entry.
- ❌ Stopping without a fresh digest when the latest is stale.
- ❌ Greedy-reading the full log when an orchestrator snapshot exists.
- ❌ Changing direction without `/pivot`.
- ❌ Skipping the cursor write at session end.
- ❌ Editing or deleting a superseded entry (use a `.superseded.md` tombstone).
- ❌ Pasting long-form ticket content into a log entry.

---

## 10. Where to go next

- [`CONVENTIONS.md`](./CONVENTIONS.md) — Mission Control rules (orchestrator snapshot format, word budgets, lint behaviour).
- [`orchestrator/brief.md`](./orchestrator/brief.md) — read this **if your identity is `orchestrator`**.
- [`examples/sample-feature/`](./examples/sample-feature/) — a complete worked feature.
- [`templates/MISSION.md`](./templates/MISSION.md) — what `/bootstrap` copies in.
- [`AGENTS.template.md`](./AGENTS.template.md) — roster template for a new team.
