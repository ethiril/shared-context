# Mission Control conventions

The human-in-the-loop layer of a feature. Everything else under `features/<slug>/` is agent-targeted; this layer is what the human opens to see what's going on without parsing logs.

Agent protocol: [`README.md`](./README.md). This file covers Mission Control only.

---

## Division of labor

| Writer                                            | Owns                                                                                            |
|---------------------------------------------------|-------------------------------------------------------------------------------------------------|
| Repo agents (listed in [`AGENTS.md`](../AGENTS.md)) | Raw events: `log/`, `repos/<self>/`, `contracts/`, `decisions/`, `digest/`.                     |
| Orchestrator (CWD = shared-context repo root)      | Per-feature `orchestrator/<timestamp>-orchestrator.md` snapshots. May edit `MISSION.md` only for scope amendments. |
| Render script (`bin/render-dashboard.mjs`)         | `dashboard.html`. Pure aggregation, no LLM.                                                     |
| Humans                                             | `MISSION.md` at feature creation; amendments on scope change.                                   |

---

## Two artifacts per feature

| Path                                                       | Audience | Mutability               | Writer                                          |
|------------------------------------------------------------|----------|--------------------------|-------------------------------------------------|
| `features/<slug>/MISSION.md`                               | Human    | Static (near-zero edits) | Bootstrap author + occasional human amendments  |
| `features/<slug>/orchestrator/<timestamp>-orchestrator.md` | Human    | Append-only              | Orchestrator agent                              |

- `MISSION.md` is the feature's **identity** (goal, scope, success criteria). What we agreed to do, not where we are.
- `orchestrator/<timestamp>-orchestrator.md` is a **snapshot** — self-contained, human-readable view of where the feature stands now. Latest file = current dashboard. All files together = changelog.

Template: [`templates/MISSION.md`](./templates/MISSION.md).

Both artifacts are conflict-free by construction: `MISSION.md` is near-static; `orchestrator/` is append-only with one writer; filenames sort chronologically; no shared index file.

---

## How the orchestrator runs

Two layers, see [`orchestrator/brief.md`](./orchestrator/brief.md) for the agent role.

**Layer 1 — render hook (cheap, automatic).** `PostToolUse` on `Write|Edit` in each repo's `.claude/settings.local.json` runs [`bin/hook-render.sh`](./bin/hook-render.sh). Filters to writes under `shared-context/features/` and calls [`bin/render-dashboard.mjs`](./bin/render-dashboard.mjs). `dashboard.html` is always current with raw state.

**Layer 2 — orchestrator agent (`/refresh`, human-triggered).** Snapshots under `features/<slug>/orchestrator/` are written when a human runs `/refresh <slug>` from any agent session. Reads [`orchestrator/brief.md`](./orchestrator/brief.md), writes one snapshot, runs the render. No automatic invocation by default — keeps the human in the loop on synthesis, surfaces tight yes/no decisions (MISSION amendments, retired-decision tombstones) before they're written.

**Opt-in headless mode.** Add [`bin/hook-orchestrate.sh`](./bin/hook-orchestrate.sh) as a second `PostToolUse` entry to auto-refresh on every digest write via `claude -p`. Unattended — no `AskUserQuestion` available.

---

## Snapshot format

```markdown
---
type: orchestrator-snapshot
author: orchestrator
at: 2026-05-15T14:30:00Z
covers_since: 2026-05-13T09-00-00-orchestrator.md     # prior snapshot, or null
status: on-track | at-risk | blocked | done | paused
trigger: manual | digest-hook | bootstrap
trigger_digest: digest/2026-05-15T14-23-00-backend.md # only when trigger == digest-hook
summary: One sentence (≤ 30 words) — headline of the snapshot. Required.
# Delta mode (omit on a full snapshot):
delta_of: 2026-05-15T14-12-00-orchestrator.md
unchanged_from_prev: [where-each-repo-stands, decisions-made, next-up]
---

## Headline
<One sentence, plain language. No jargon without a one-line gloss.>

## Where each repo stands
- **<repo>** — <1–2 sentences>

## What shipped since the last snapshot
- <bullet>

## Decisions made
- <decision> — <one-line rationale; reference `decisions/<file>.md` by bare filename>

## Open for the human
- <item> — first raised <YYYY-MM-DD>
- STALE: <item open >24h, escalation-flagged>
- <or: "Nothing — we're heads-down.">

## Next up
- <repo>: <what's next>
```

### Rules

- Write for a human who hasn't looked at the project in a week, **and** for a repo agent doing Quick resume next session. Human voice; agent-actionable content.
- **"Open for the human" pins to the top of `dashboard.html`.** Specific and action-shaped. Date items with `first raised <YYYY-MM-DD>`; lead with `STALE:` once an item is >24h old.
- **"Where each repo stands" + "Next up" are what repo agents read first.** Be concrete: branch name, what's done, what's blocked, what's next.
- **Reference, don't restate.** Bare filenames; the render script links them.
- **`summary:` required.** Feeds the dashboard and per-feature `_index.md`.
- **≤ 500 words of body.** Beyond that you're competing with the digest.
- **Mirror terminal MISSION status.** If `MISSION.md` is `status: done | paused`, set the snapshot the same.

### Delta mode

Use when the previous snapshot is < 1h old AND only acks/cursors/inbox chatter happened since.

- Set `delta_of:` to the previous snapshot's filename.
- Set `unchanged_from_prev:` to the slugs of sections that haven't changed. The render script inlines those verbatim from the prior snapshot.
- Include only sections that genuinely changed (usually `Headline`, `What shipped`, moved `Open for the human` items).
- Total body ≤ 150 words.
- Don't write deltas of deltas more than two hops deep — reset by writing a full snapshot.

---

## Snapshot vs digest

| Aspect    | `digest/` (repo agents write)             | `orchestrator/` (orchestrator writes)              |
|-----------|-------------------------------------------|----------------------------------------------------|
| Audience  | The next agent                            | The human (and Quick-resume agents as a checkpoint)|
| Style     | Structured, dense, refs-heavy             | Prose, narrative, plain language                   |
| Cadence   | Session end or every ~10 log entries      | `/refresh` (manual) + bootstrap + opt-in digest hook |
| Coverage  | Everything an agent needs to resume work  | What the human needs to stay aligned               |

A snapshot may reference the latest digest by filename; otherwise stands alone.

---

## Scope amendments to `MISSION.md`

The only routine edit to `MISSION.md`.

1. Repo agent drops `kind: pivot` per the protocol.
2. Orchestrator (or human) edits `MISSION.md` to reflect the new scope.
3. Appends one line under `## Amendments`: `- 2026-05-15 — orchestrator: <one-liner; ref the pivot filename>`.

Pull before editing, push immediately after.

---

## Bootstrap a feature

Use `/bootstrap <slug>` from any agent session in a participating repo. The slash command (see [`commands/bootstrap.md`](./commands/bootstrap.md)) handles the whole flow:

1. Auto-wires shared-context Read/Write permissions into the bootstrapping repo's `.claude/settings.local.json` (one-time per repo).
2. Scaffolds `features/<slug>/` directory tree.
3. Copies `templates/MISSION.md` to `features/<slug>/MISSION.md` and walks you through Goal / Scope / Repos / Success criteria.
4. Writes the founding repo's first positional status under `repos/<self>/`.
5. Drops a `[fy]` announcement DSL log entry so other repos can discover the feature.
6. Writes a minimal first orchestrator snapshot inline (the founding agent temporarily wears the orchestrator hat for this single write).
7. Runs `node framework/bin/render-dashboard.mjs` so the dashboard reflects the new feature immediately.

After bootstrap, other repos run `/join <slug>` once each to announce their presence, then everyone switches to `/resume <slug>` for ongoing work.

---

## Writing for agents (terseness rules)

Files under `log/`, `digest/`, `decisions/`, `contracts/`, `repos/<self>/`, `cursors/<self>/` become context tokens that subsequent agents pay for on resume. The orchestrator snapshot is the only human-facing layer.

1. **Lead with the answer.** First sentence = the WHAT or the DECISION. Backstory after, if at all.
2. **Bullets over prose** for working files. Prose only in `MISSION.md` and `orchestrator/`.
3. **`summary:` mandatory** (≤ 30 words). It's what shows up in `_index.md`.
4. **Link, don't restate.** Reference decisions/contracts by filename.
5. **No throat-clearing.** Drop "Hi, just wanted to update you on…", "Here's a quick summary…". Start with substance.
6. **Word budgets per body** (enforced by [`bin/hook-lint.sh`](./bin/hook-lint.sh)). Budgets apply to body content regardless of wrapper format — for compact formats (DSL log, positional repos, DSL contracts), the entire record's content after the structural fields counts as "body":

   | Artifact            | Budget         | Format (see [`README.md` §7](./README.md#7-artefact-formats)) |
   |---------------------|----------------|----------------------------------------------|
   | `log/` entries      | 50–200 words   | One `.dsl` file per event in `log/` (single DSL line) |
   | `decisions/` ADRs   | 100–300 words  | YAML + body (md+YAML)                       |
   | `contracts/<api>/`  | unlimited (schema is schema; no commentary outside the schema) | DSL line per version |
   | `repos/<self>/`     | 100–250 words  | Positional record line per file              |
   | `digest/`           | 400–800 words  | YAML + body (md+YAML)                       |
   | `cursors/<self>/`   | ≤ 80 words (frontmatter + one-line note) | YAML + one-line body            |
   | `orchestrator/`     | ≤ 500 words    | YAML + body (md+YAML)                       |

### Lint enforcement

`bin/hook-lint.sh` runs as `PreToolUse` on `Write`. Default mode: warn (stderr + write proceeds). Set `SHARED_CONTEXT_LINT_MODE=block` to exit 2 — Claude Code surfaces the message as a system reminder so the agent re-plans.

What the lint checks:

- **Body word budgets** (table above) for every supported artefact type.
- **Log `from:` identity** is listed in `AGENTS.md` (both DSL and legacy md log entries).
- **Positional repo-status schema** — every `.positional` file must have exactly 9 `|`-separated fields, and its first field (the `repo:`) must match the `<repo>` segment of its path. Catches "wrote into another repo's `repos/<them>/`" and missing-pipe parse errors before the dashboard silently drops the row.
- **Cursor frontmatter shape** — `cursors/<repo>/current.md` must declare all required keys (`type`, `repo`, `at`, `last_checkpoint_read`, `last_log_read`, `last_pivot_read`, `contracts_synced`, `last_decision_read`); null values are fine but the keys must be present. The `repo:` value must match the path segment.

**Opt-out for genuinely oversize artifacts** (e.g. an RFC-shaped `ask`): make the first non-blank body line, immediately after the frontmatter:

```
# allow-oversize: <one-line reason — e.g. "v2.1 scope RFC; mirrors PR description">
```

Use sparingly. The next agent still pays the read cost — prefer splitting into a `decisions/` ADR + a short `log/` pointer.

### Retiring old entries

Drop a `<original-stem>.superseded.md` tombstone (frontmatter only, empty body). Agents skip the original by default; the dashboard badges it as superseded. This is how append-only is honoured while pruning. Frontmatter shape in [`README.md` §7](./README.md#tombstone--superseded).

### Signalling "I'm done with my part"

When a repo finishes its work on a feature but the feature isn't fully closed (other repos still have work to do, deploy still pending, etc.), don't go silent — leave a clear marker so the rest of the team isn't guessing whether you're stuck or waiting:

1. Write a fresh `repos/<self>/<iso>.positional` with:
   - `current_goal: idle — waiting on <repo|event>` (e.g. `idle — waiting on app-gateway` or `idle — waiting on prod deploy slot`).
   - `next: ` (empty).
   - `blocked_on: <one-phrase blocker>` if there's something specific others should action. The dashboard surfaces `blocked_on` automatically; this is how you make the wait visible without writing a log entry.
2. Optionally: a single `[fy]` log line if it's worth announcing ("test-repo-1 done; output is X; see Y").

No protocol change — just a documented pattern. `/close-project` is the right verb only when the *whole feature* is wrapping up.

---

## Human consumption

```bash
open dashboard.html                      # cross-feature view; "needs your attention" pinned to top
cat features/<slug>/MISSION.md           # what we agreed to do
open features/<slug>/orchestrator/$(ls features/<slug>/orchestrator/ | sort | tail -1)
                                         # latest snapshot in isolation
ls features/<slug>/orchestrator/         # changelog (newest at bottom)
```
