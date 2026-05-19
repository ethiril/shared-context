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

### First-time onboarding (`/join <slug>`)

Run once per repo per feature. Hard-refuses if `repos/<self>/` already has anything. Reads MISSION + latest snapshot to orient, then writes:

1. `features/<slug>/repos/<self>/<iso>.positional` — bootstrap-state positional row (summary + current_goal filled; empty lists; `[]` JSON).
2. `features/<slug>/log/<iso>-<self>-join.dsl` — single `[fy]` line announcing presence (owns `<area>`; ask about `<topics>`).
3. `features/<slug>/cursors/<self>/current.md` — fresh cursor; `last_log_read` = your own join filename.

After joining, switch to `/resume` for ongoing work.

### Resume (`/resume <slug>`)

The default mid-feature command. Light state-load → apply pivots → watch for in-session pivot triggers → pull inbox → **auto-ack `[fy]` and `[ak]` without asking** → `AskUserQuestion` per substantive item (`[q]`/`[bl]`/`[cc]`/`[ch]`/`[tk]`) → write responses → update cursor. Read in this order, stop when you have enough:

1. `features/<slug>/MISSION.md` — feature identity.
2. `features/<slug>/orchestrator/` — newest file. **Treat as having absorbed everything older than its `at:`.** This is your checkpoint.
3. `features/<slug>/cursors/<self>/current.md` — your bookmark.
4. `features/<slug>/repos/<self>/` — newest file. Your task brief.
5. `features/<slug>/log/*.dsl` — entries with kind `[pv]` newer than the checkpoint. **Apply pivots before anything else.**
6. `features/<slug>/log/*.dsl` — entries with `to` containing your identity (or `all`) newer than `cursor.last_log_read`. Auto-ack `[fy]`/`[ak]`; surface the rest.

Fall back to newest `digest/` if no orchestrator snapshot exists.

### Catch up (`/catch-up <slug>`)

The cold-start. Lead with `_index.md` (auto-generated skim layer) and drill into referenced files only as needed:

1. `features/<slug>/_index.md` — mission status + latest checkpoint + last 4 logs + recent decisions + latest positional per repo. ~80% of catch-up needs in ~1.5K bytes.
2. `features/<slug>/MISSION.md` — feature identity (skip if loaded this session).
3. Latest file in `features/<slug>/orchestrator/` — full checkpoint snapshot.
4. `features/<slug>/cursors/<self>/current.md` — your bookmark.
5. `features/<slug>/repos/<self>/` — your latest positional.
6. Drill down on items the index flagged: log entries `to:` you newer than `cursor.last_log_read`, contracts you'll touch, accepted decisions newer than `cursor.last_decision_read`. Don't read every ADR by default — open only what's relevant.

Reports state + next action; doesn't write inbox responses (use `/resume` for that).

### Full audit (`/audit <slug>`)

Catch up + every log/decision/contract since cursor regardless of `to:` filter, **including superseded entries, `.skipped.md`, and DSL entries retired by a later `[pv]`'s `supersedes:`**. Ignores the 5k budget. Use sparingly.

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

| Command                                | When                                              | What it does                                                                                              |
|----------------------------------------|---------------------------------------------------|-----------------------------------------------------------------------------------------------------------|
| `/bootstrap <slug>`                    | Starting a new feature                            | Scaffolds folders, copies `templates/MISSION.md`, prompts for goal/scope, writes founding repo's first positional status + `[fy]` announcement |
| `/join <slug>`                         | First time a new repo participates in a feature   | Hard-refuses if already joined. Writes the joining repo's first positional status + `[fy]` announcement + cursor                  |
| `/resume <slug>`                       | Default mid-feature command (after `/clear`, between work sessions, or to clear inbox) | Light state-load → apply pivots → pull inbox → auto-ack `[fy]`/`[ak]` → ask per substantive item → write responses → update cursor |
| `/catch-up <slug>`                     | Cold start after a long break                     | Heavier read than `/resume`: adds `_index.md`, recent decisions, contracts. Reports state; doesn't write inbox responses          |
| `/audit <slug>`                        | Verify history; something looks wrong             | Full read incl. superseded + DSL entries retired by `[pv]`'s `supersedes:`. Ignores the 5k budget                                  |
| `/handoff <slug>`                      | Before `/clear`                                   | Writes digest (conditional) + cursor                                                                                              |
| `/pivot <slug> <reason>`               | Direction changing                                | Per-event `[pv]` DSL file + tombstones for retired items + fresh digest. Propose this proactively if a session reveals a pivot trigger |
| `/refresh <slug>`                      | Update the human dashboard now                    | Rebuilds orchestrator snapshot + `dashboard.html` + `_index.md`. May ask tight yes/no questions inline.                            |
| `/close-project <slug> [done\|paused]` | Wrapping up                                       | Flips `MISSION.md` status + closing digest. Dashboard archives the feature.                                                       |

---

## 5. What to write where (during work)

| What happened                                | Write where                                                                                        |
|----------------------------------------------|----------------------------------------------------------------------------------------------------|
| Code change others should know about         | New `log/<iso>-<self>-<slug>.dsl` (`[kind]` = `ch` or `fy`)                                          |
| Changed/added an API surface                 | New `contracts/<api>/<iso>-<repo>-v<version>.dsl` + new `log/<iso>-<self>-<slug>.dsl` (`[cc]`)       |
| Non-obvious design choice                    | New `decisions/<iso>-<title>.md` + new `log/<iso>-<self>-<slug>.dsl` (`[ch]` or `[fy]` referencing it) |
| Need something from another repo (blocking)  | New `log/<iso>-<self>-<slug>.dsl` (`[q]`, `from > <repo>`)                                           |
| Open-ended discussion, not blocking          | New `log/<iso>-<self>-<slug>.dsl` (`[q]`, non-blocking by tone)                                      |
| Answering an inbound `ask`/`question`        | New `log/<iso>-<self>-<slug>.dsl` (`[a]`, `refs: <inbound-filename>`)                                |
| Scoped cross-repo work needing a spec        | New `tickets/<kebab-slug>.md` + new `log/<iso>-<self>-<slug>.dsl` (`[tk]`, `refs: tickets/<slug>.md`) |
| Updating an existing ticket                  | Edit `tickets/<slug>.md` in place + new `log/<iso>-<self>-<slug>.dsl` (`[tk]`)                       |
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

- **Log entries:** `features/<slug>/log/<iso>-<repo>-<slug>.dsl` — one file per event; concurrent writers never collide.
- **Repo statuses:** `features/<slug>/repos/<repo>/<iso>.positional` — one file per status snapshot.
- **Contract versions:** `features/<slug>/contracts/<api>/<iso>-<repo>-v<X.Y.Z>.dsl` — one file per version.

---

## 7. Artefact formats

**`FRAMEWORK_VERSION = 2`** — bumped whenever this section's grammars change in a way that requires agents to re-read. Agents that have absorbed v2 (their repo's `.claude/settings.local.json` carries `"shared_context_framework_version": 2`) can skip re-reading §7 on session start. `/bootstrap` and `/join` write this field as part of their permissions step.

**Bump rule (any one triggers a bump):**

- Changing an existing format's grammar (e.g. positional schema field order/count, DSL line grammar, YAML frontmatter shape).
- Introducing a **new compact format** (an additional `.dsl` / `.positional` flavour). Agents that only know v2 wouldn't parse it correctly.
- Renaming or repurposing an existing kind code in the log DSL (e.g. if `[ch]` meant something different).

**Doesn't require a bump:**

- Adding a new optional YAML frontmatter field with a default (agents that don't expect it just ignore it).
- Adding a new log kind code that doesn't replace an existing one (agents that don't recognise it fall through to legacy parse).
- Documentation-only edits to §7 that don't change parser behaviour.

Bumps require a migration note in the bump itself (`v2 → v3: <what changed; what agents need to know>`).

`summary:` is **required** on every agent-targeted file. One sentence, ≤ 30 words. Feeds `_index.md`.

**Three artefacts use compact line-based formats** (chosen by `agent-format-pass` + `agent-format-pass-v2` measurement + 3-tier parse-reliability sweep): `log/`, `repos/`, `contracts/`. **The rest use YAML frontmatter** (with optional body). Compact formats inline a legend reference at the top of this section so readers/writers don't need to look anywhere else.

Legacy md+YAML files of any artefact type are still parsed by the renderer indefinitely — agents only need to use the new shapes on **new** writes.

### log entries — DSL, one file per event

Path: `features/<slug>/log/<iso>-<repo>-<slug>.dsl`. **One event per file.** The whole file is a single DSL line. Per-file naming means concurrent writers from different repos never collide on the same path.

Filename: `<iso>` is `YYYY-MM-DDTHH-MM-SS` (UTC, colons encoded as dashes), `<repo>` is your identity from `AGENTS.md`, `<slug>` is a short kebab-case topic.

Grammar (one line per file):

```
from > to [kind] @at: summary | refs: r1,r2 | body...
```

- `from` — repo identifier.
- `to` — repo identifier OR `all` OR comma-separated list (e.g. `worker,mobile`).
- `kind` — one of: `cc` (contract-change), `q` (question), `a` (answer), `fy` (fyi), `bl` (blocker), `pv` (pivot), `ch` (change), `ak` (ack), `tk` (ticket-update).
- `@at` — ISO timestamp with colons (UTC). Legacy alternative: `[at]` as a leading prefix; the parser accepts both.
- `summary` — required; ≤ 30 words.
- `refs:` — optional; comma-separated paths (log filenames or paths to other artefacts).
- `body` — free-form prose after the final `|`. Pipe-escape (`\|`) any embedded `|`.

For `kind: pv` (pivot): include `supersedes: all-prior` (or a comma-separated list of filenames or `@at` timestamps) as a labelled section before `body`.

Example file `2026-05-15T14-23-00-api-welcome-email-cc.dsl`:

```
api > worker [cc] @2026-05-15T14:23:00Z: POST /signup now enqueues welcome-email-job v1.0.0 | refs: contracts/auth-api/2026-05-15T14-23-00-backend-v0.3.0.dsl, decisions/2026-05-15T14-00-00-fire-and-forget.md | POST /signup enqueues a welcome-email job after the user row commits. Fire-and-forget — no retry, no callback. @worker: please confirm dequeue.
```

`kind` distinctions:
- `ask` (use `q`) is **blocking**; the asker can't proceed without a substantive `answer` (`a`).
- `question` (also `q`) is non-blocking; "while you're here…".
- `ticket` first announcement uses `tk` and points at `tickets/<slug>.md` in refs; subsequent updates use `tk` too.

Append-only at the folder level: write new files; don't edit existing ones. Pivots retire prior entries via `supersedes:` referencing the prior filenames (or their `@at` timestamps).

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
- **`blocked_on` entries auto-surface on the dashboard's "Needs your attention" section** — no `/refresh` needed. Use it for cross-repo blockers ("ask to test-repo-2 unanswered since @2026-05-19T09:00Z", "deploy slot owed by infrastructure"). Keep each entry one short phrase; one entry per concrete blocker.

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

### overview (deprecated)

Pre-2026-05-19 features may have an `overview/` folder with YAML+body files. The renderer still parses them; agents don't write new ones. MISSION.md + its `## Amendments` section is the single source of feature identity.

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
