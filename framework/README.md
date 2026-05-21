# shared-context — agent protocol

> You are an agent. This is the file you act on. Top-level `README.md` is human onboarding — ignore it.

Multi-repo coordination via timestamped, append-only files under `features/<slug>/`. Latest orchestrator snapshot is your session-start checkpoint; logs/contracts/decisions are the source of truth.

---

## 1. Identify yourself

Open [`AGENTS.md`](../AGENTS.md). Find the row whose CWD matches yours — that row's kebab-case `Repo identity` is your `<repo>` value in every filename and `from:` / `author:` field. If no row matches, stop and ask the human to add one. Don't invent an identity.

CWD = shared-context repo root: identity depends on **work mode** — `orchestrator` for synthesis passes (read [`orchestrator/brief.md`](./orchestrator/brief.md) instead of continuing here), `framework` for framework-maintenance work.

---

## 2. Global read rules

Each slash command (§4) owns its own protocol. The rules below apply to every command.

- **Sort by filename, not mtime.** Filenames are UTC ISO timestamps; mtime is clock-skew-prone.
- **Default skip** `status: superseded`, files with a `*.superseded.md` sibling, and `*.skipped.md`. Only `/audit` reads them.
- **DSL entries retired by a later `[pv]`'s `supersedes:` are out of scope** in every mode except `/audit`.
- **`overview/` is deprecated.** Agents never write to it. MISSION.md + `## Amendments` is the single source of feature identity.
- **Latest orchestrator snapshot is your checkpoint.** Treat everything older than its `at:` as absorbed. Fall back to newest `digest/` if no snapshot exists.

---

## 3. Folder map + write rules

```
features/<slug>/
├── MISSION.md          static; human-authored at bootstrap, append-only `## Amendments` for scope changes
├── _index.md           generated; do not write
├── orchestrator/       orchestrator-only; you never write here
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

Each command file owns its protocol. This table is just the index.

| Command                                | When                                                                  |
|----------------------------------------|-----------------------------------------------------------------------|
| `/bootstrap <slug>`                    | Starting a new feature                                                |
| `/join <slug>`                         | First time a new repo participates in a feature                       |
| `/resume <slug>`                       | Default mid-feature command (after `/clear`, between sessions, clear inbox) |
| `/catch-up <slug>`                     | Cold start after a long break                                         |
| `/audit <slug>`                        | Verify history; something looks wrong                                 |
| `/handoff <slug>`                      | Before `/clear`                                                       |
| `/pivot <slug> <reason>`               | Direction changing                                                    |
| `/refresh <slug>`                      | Update the human dashboard now                                        |
| `/tighten <slug>`                      | Review + refactor + test-verify the current branch's changes          |
| `/close-project <slug> [done\|paused]` | Wrapping up                                                           |

---

## 5. What to write where (during work)

| What happened                                | Write where                                                                                        |
|----------------------------------------------|----------------------------------------------------------------------------------------------------|
| Code change others should know about         | `log/<iso>-<self>-<slug>.dsl` (`[kind]` = `ch` or `fy`)                                            |
| Changed/added an API surface                 | `contracts/<api>/<iso>-<repo>-v<version>.dsl` + `log/` `[cc]`                                      |
| Non-obvious design choice                    | `decisions/<iso>-<title>.md` + `log/` `[ch]` or `[fy]` referencing it                              |
| Need something from another repo (blocking)  | `log/` `[q]`, `from > <repo>`                                                                       |
| Open-ended discussion, not blocking          | `log/` `[q]`, non-blocking by tone                                                                  |
| Answering an inbound ask/question            | `log/` `[a]`, `refs: <inbound-filename>`                                                            |
| Scoped cross-repo work needing a spec        | `tickets/<kebab-slug>.md` + `log/` `[tk]`, `refs: tickets/<slug>.md`                                |
| Updating an existing ticket                  | Edit `tickets/<slug>.md` in place + `log/` `[tk]`                                                   |
| Contract version discussed and declined      | `contracts/<api>/<iso>-<repo>-v<version>.skipped.md` + log entry explaining why                    |
| Direction is changing                        | `/pivot <slug> <reason>` — writes `[pv]` with `supersedes:`                                        |
| Your repo's status changed                   | `repos/<self>/<iso>.positional`                                                                     |
| Want a checkpoint                            | `digest/<iso>-<repo>.md`                                                                            |
| Want the dashboard re-synthesised            | `/refresh <slug>`                                                                                   |

**Single-concern rule:** one change → one file. Don't bundle.

---

## 6. File naming

YAML-frontmatter artefacts: `YYYY-MM-DDTHH-MM-SS-<repo>[-<slug>].md` — UTC (`date -u +"%Y-%m-%dT%H-%M-%S"`). Decisions drop the `<repo>` prefix: `<iso>-<title>.md`. Tickets are kebab-slug only (no timestamp; edit-in-place). Cursor is `cursors/<repo>/current.md` (overwrite each session).

Compact artefacts (§7): `log/<iso>-<repo>-<slug>.dsl`, `repos/<repo>/<iso>.positional`, `contracts/<api>/<iso>-<repo>-v<X.Y.Z>.dsl`.

Tombstones: `<original-stem>.superseded.md` (retires a sibling); `<iso>-<repo>-v<version>.skipped.md` (contract version discussed and not published, standalone).

---

## 7. Artefact formats

**`FRAMEWORK_VERSION = 2`** — bumped when grammars change. Agents whose `.claude/settings.local.json` carries `"shared_context_framework_version": 2` can skip re-reading this section. `/bootstrap` and `/join` write the field.

**Bump triggers:** changing an existing format's grammar; introducing a new compact format flavour; renaming a kind code. **Non-bumps:** adding optional YAML fields with defaults; adding a new kind code that doesn't replace an existing one. Bumps require a `v2 → v3: <what changed>` migration note.

`summary:` is **required** on every agent-targeted file. One sentence, ≤ 30 words. Feeds `_index.md`.

Three artefacts use compact line-based formats: `log/`, `repos/`, `contracts/`. The rest use YAML frontmatter + optional body. Legacy md+YAML for any artefact still parses on read; only **new writes** use the compact shapes.

### log entries — DSL, one file per event

Path: `features/<slug>/log/<iso>-<repo>-<slug>.dsl`. Whole file is a single line. Per-file naming = concurrent writers never collide.

```
from > to [kind] @at: summary | refs: r1,r2 | body...
```

- `from` — repo identifier. `to` — repo OR `all` OR comma-separated list.
- `kind` — `cc` contract-change, `q` question/ask, `a` answer, `fy` fyi, `bl` blocker, `pv` pivot, `ch` change, `ak` ack, `tk` ticket-update.
- `@at` — ISO with colons (UTC). Legacy: leading `[at]` prefix; parser accepts both.
- `summary` — ≤ 30 words. `refs:` — optional comma-separated paths. `body` — prose; pipe-escape (`\|`) embedded `|`.
- `kind: pv` includes `supersedes: all-prior` (or comma-separated filenames/`@at`s) as a labelled section before `body`.
- `q`-ask is **blocking** (asker can't proceed without `a`). `q`-question is non-blocking ("while you're here").

Example `2026-05-15T14-23-00-api-welcome-email-cc.dsl`:

```
api > worker [cc] @2026-05-15T14:23:00Z: POST /signup enqueues welcome-email-job v1.0.0 | refs: contracts/auth-api/2026-05-15T14-23-00-backend-v0.3.0.dsl | Fire-and-forget; no retry. @worker confirm dequeue.
```

Append-only at folder level; never edit. Pivots retire via `supersedes:`.

### contract versions — DSL, one file per version

Path: `features/<slug>/contracts/<api>/<iso>-<repo>-v<X.Y.Z>.dsl`.

```
name@version [status] @at by <author>: summary | consumers: r1,r2 | breaking: true|false | queue: name=<n> backend=<b> vt=<seconds>s | payload: f1(type;req|opt;notes); f2(...); ... | producer: <p> | consumer: <c> | coupling: <c>
```

`@at` optional (filename usually carries it). Sections after `summary` are optional and order-independent. `payload:` items are `field(type;req|opt;notes)` triplets, semicolon-separated.

```
welcome-email-job@1.0.0 [active] by api: v1 job schema | consumers: worker | breaking: false | queue: name=welcome-emails backend=Redis-bull vt=30s | payload: userId(string;req;UUIDv4); email(string;req;RFC5322); locale(string;req;BCP-47) | producer: API enqueues once per signup | consumer: Worker idempotent on retry | coupling: fire-and-forget
```

Supersession: `<api>/<original-stem>.superseded.md` sibling tombstone (YAML, see below).

### repo status — positional, one file per snapshot

Path: `features/<slug>/repos/<repo>/<iso>.positional`. Single line per file.

Schema (field separator `|`; multi-value `~`; embedded `|` → `\|`):

```
repo|at|summary|current_goal|done|next|blocked_on|contracts_in_play|open_questions
```

- `done`, `next`, `blocked_on` are `~`-separated string lists.
- `contracts_in_play`, `open_questions` are **inline JSON** (empty = `[]`; blank field is a parse error).
- **`blocked_on` auto-surfaces on the dashboard's "Needs your attention".** One short phrase per concrete blocker. No `/refresh` needed.

```
api|2026-05-15T14:23:00Z|v1 enqueue shipped; awaiting worker ack|Enqueue welcome-email on signup|POST /signup enqueues v1.0.0~ADR published~Tests green|Joint staging test once worker confirms||[{"name":"welcome-email-job","version":"1.0.0","role":"owner","consumer":"worker"}]|[{"to":"worker","ask":"confirm consumer wired"}]
```

### YAML artefacts

Frontmatter shapes (body follows after `---`):

```yaml
# decision (ADR)
type: decision
title: Use JWT for stateless auth
author: <repo>
at: 2026-05-15T14:23:00Z
summary: One sentence — the rule and its scope.
status: proposed | accepted | superseded
affects: [auth-api]
```

```yaml
# digest
type: digest
author: <repo>
at: 2026-05-15T14:30:00Z
summary: One sentence — state at this checkpoint.
```

```yaml
# cursor — cursors/<repo>/current.md (rolling)
type: cursor
repo: <repo>
at: 2026-05-15T14:50:00Z
last_checkpoint_read: 2026-05-15T14-30-00-orchestrator.md
last_log_read: 2026-05-15T14-45-12-frontend.md
last_pivot_read: null
contracts_synced:
  auth-api: 2026-05-15T14-23-00-backend-v0.3.0.md
last_decision_read: 2026-05-15T14-23-00-use-jwt.md
# body: one short line — what next-session-you should remember in five words
```

```yaml
# ticket — tickets/<kebab-slug>.md, edit-in-place
type: ticket
slug: flutter-voucher-migration
title: Flutter voucher migration — swap Firebase RC for /vouchers/validate
author: <repo-who-scoped-it>
assignee: <repo-who-executes>
at: 2026-05-15T14:23:00Z
last_updated: 2026-05-16T01:00:00Z
status: open | in-progress | done | cancelled
summary: One sentence — what the ticket asks for.
refs: [contracts/vouchers-api/2026-05-15T15-56-43-app-gateway-v1.0.1.md]
# body: spec as long as needed. Logs reference via refs: [tickets/<slug>.md]; don't paste body into logs.
```

```yaml
# tombstone — <original-stem>.superseded.md (body empty)
type: tombstone
variant: superseded
original: 2026-05-13T10-00-00-use-jwt.md
superseded_by: 2026-05-20T09-00-00-use-paseto.md
at: 2026-05-20T09:00:00Z
```

```yaml
# tombstone — <iso>-<repo>-v<version>.skipped.md under contracts/<api>/ (standalone)
type: tombstone
variant: skipped
contract: vouchers-api
version: 1.0.2
declined_by: log/2026-05-15T22-06-40-subscriptions-gateway-change-architecture.md
at: 2026-05-15T22:06:40Z
reason: One sentence — why this version was discussed and not written.
```

### Legacy contract md+YAML (still read; do not write new)

```yaml
type: contract
name: auth-api
version: 0.3.0
author: <repo>
at: 2026-05-15T14:23:00Z
summary: One sentence — what this version adds.
supersedes: 2026-05-13T10-00-00-backend-v0.2.0.md
consumers: [frontend, mobile]
breaking: false
status: active | superseded
```

---

## 8. Principles & anti-patterns

- **Append-only.** Never edit existing files outside the exceptions: `MISSION.md` amendments, `cursors/<self>/current.md` (rolling), `tickets/<slug>.md`, generated files. Retire via `.superseded.md` tombstones.
- **Read the snapshot, not the digest.** Latest `orchestrator/<file>.md` is your checkpoint. Digest is for deep audits.
- **`summary:` required** (≤ 30 words) on every agent-targeted file.
- **One change → one file.** Don't bundle.
- **Never write another repo's `repos/<them>/`.** Use `log/` with `to: [<them>]`.
- **Every contract change ships with `[cc]`. Every direction change ships with `/pivot`.**
- **One ticket, one location.** Cross-repo specs in `tickets/<slug>.md`, `refs:`-pointed from logs.
- **Latest wins by filename sort.** UTC ISO timestamps; never sort by mtime.
- **Skip superseded by default.** Use `/audit` if you need full history.
- **Don't change a contract or direction without the matching kind line.**
- **Don't greedy-read the full log when an orchestrator snapshot exists.**
- **Don't skip the cursor write at session end.**
- **Don't paste long-form ticket content into a log entry.**

---

## 9. Where to go next

- [`CONVENTIONS.md`](./CONVENTIONS.md) — Mission Control rules (orchestrator snapshot format, word budgets, lint).
- [`orchestrator/brief.md`](./orchestrator/brief.md) — read this **if your identity is `orchestrator`**.
- [`examples/sample-feature/`](./examples/sample-feature/) — a complete worked feature.
- [`templates/MISSION.md`](./templates/MISSION.md) — what `/bootstrap` copies in.
- [`AGENTS.template.md`](./AGENTS.template.md) — roster template for a new team.
