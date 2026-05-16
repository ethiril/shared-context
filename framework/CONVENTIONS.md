# Mission Control conventions

The human-in-the-loop view of a feature. Everything else under `features/<slug>/` is agent-targeted; this layer is what you (human) open to see what's going on without parsing logs.

Full agent protocol: [`README.md`](./README.md). This file documents only the Mission Control layer.

---

## Division of labor

| Writer                          | Owns                                                                                  |
|---------------------------------|---------------------------------------------------------------------------------------|
| Repo agents (each listed in `AGENTS.md`) | Raw events only: `log/`, `repos/<self>/`, `contracts/`, `decisions/`, `digest/`. Same as today. |
| Orchestrator agent (CWD = shared-context repo root) | Synthesis for humans: per-feature `orchestrator/<timestamp>-orchestrator.md` snapshots. May edit `MISSION.md` only for scope amendments. |
| Render script (`framework/bin/render-dashboard.mjs`) | The HTML dashboard at `dashboard.html`. Pure aggregation, no LLM. |
| Humans                          | `MISSION.md` at feature creation; amendments to it on scope change.                  |

Identities in [`AGENTS.md`](../AGENTS.md) (template at [`AGENTS.template.md`](./AGENTS.template.md)). The orchestrator is its own identity.

---

## Two artifacts per feature

| Path                                                  | Audience | Mutability             | Writer                |
|-------------------------------------------------------|----------|------------------------|-----------------------|
| `features/<slug>/MISSION.md`                          | Human    | Static (near-zero edits) | Bootstrap author + occasional human amendments |
| `features/<slug>/orchestrator/<timestamp>-orchestrator.md` | Human    | Append-only             | Orchestrator agent    |

- `MISSION.md` is the feature's **identity**: goal, scope, success criteria. Captures what we agreed to do, not where we are.
- `orchestrator/<timestamp>-orchestrator.md` is a **snapshot**: a self-contained, human-readable view of where the feature stands right now, in plain prose. Latest file = current dashboard. All files together = changelog.

Template: [`templates/MISSION.md`](./templates/MISSION.md). Copied into the feature at bootstrap.

---

## Why this can't merge-conflict

By construction:

1. **`MISSION.md` is near-static.** Written once at bootstrap. Edited only for genuine scope changes (rare, coordinated — see "Scope amendments").
2. **`orchestrator/` is append-only.** Every snapshot is a brand-new timestamped file with one writer (the orchestrator). No shared mutable file → no concurrent-write race.
3. **Filenames sort chronologically.** Lexical sort puts newest at the bottom. No index file to keep in sync.

If you're tempted to put rapidly-changing state directly into `MISSION.md`, don't — that's what `orchestrator/` is for.

---

## How the orchestrator runs (command-triggered by default)

See [`orchestrator/brief.md`](./orchestrator/brief.md) for the agent's full role definition. Operationally there are two layers:

**Layer 1 — Render hook (cheap, fires often, automatic).**
A `PostToolUse` hook on `Write|Edit` in each repo's `.claude/settings.local.json` runs [`bin/hook-render.sh`](./bin/hook-render.sh). The hook filters to writes under `shared-context/features/` and calls [`bin/render-dashboard.mjs`](./bin/render-dashboard.mjs). Zero LLM cost, ~instant. Result: `dashboard.html` is always current with the latest raw state.

**Layer 2 — Orchestrator agent (human-triggered via `/refresh`).**
Synthesised snapshots under `features/<slug>/orchestrator/` are written when a human runs `/refresh <feature>` from any agent session. The command reads [`orchestrator/brief.md`](./orchestrator/brief.md), produces one snapshot, then runs the render script. **No automatic invocation by default** — this keeps the human in the loop, avoids redundant snapshots, and surfaces tight yes/no decisions (MISSION amendments, retired-decision tombstones) before they're written.

**Opt-in: auto-orchestrate.** Add [`bin/hook-orchestrate.sh`](./bin/hook-orchestrate.sh) as a second `PostToolUse` entry to re-enable the original "fires on every digest write" behaviour. Useful if you want the dashboard's synthesised view to update without human prompting. The script invokes `claude -p` headlessly. Cost: one LLM round-trip per digest write; the orchestrator can't ask you questions because it runs unattended.

(Both scripts are in `framework/bin/` — the relative links above are from this doc's location inside `framework/`.)

---

## Snapshot format

```markdown
---
type: orchestrator-snapshot
author: orchestrator
at: 2026-05-15T14:30:00Z
covers_since: 2026-05-13T09-00-00-orchestrator.md   # prior snapshot, or null
status: on-track | at-risk | blocked | done | paused
trigger: manual | digest-hook | bootstrap
trigger_digest: digest/2026-05-15T14-23-00-backend.md   # if trigger == digest-hook
# Optional — delta mode (see orchestrator/brief.md):
delta_of: 2026-05-15T14-12-00-orchestrator.md           # prior snapshot this extends
unchanged_from_prev: [where-each-repo-stands, next-up]  # sections to inherit verbatim
---

## Headline
<One sentence. Where are we, in plain language.>

## Where each repo stands
- **<repo>** — <1–2 sentences>
- **<repo>** — <1–2 sentences>

## What shipped since the last snapshot
- <bullet>
- <bullet>

## Decisions made
- <decision> — <one-line rationale; link to `decisions/<file>.md` if any>

## Open for the human
- <question or decision needing human input> — first raised <YYYY-MM-DD>
- STALE: <item open >24h, escalation-flagged>
- <or: "Nothing — we're heads-down.">

## Next up
- <repo>: <what's next>
- <repo>: <what's next>
```

Rules:

- **Write for a human who hasn't checked in for a week.** No jargon without a one-line gloss. No bare filenames — say what's in the file.
- **"Open for the human" is the most important section.** The dashboard pins these to the top of the page. If nothing is open, say so explicitly — silence is ambiguous.
- **Reference, don't restate.** Link decisions, contracts, and digests by filename. The human can dig deeper if they want.
- **`covers_since`** points to the previous orchestrator snapshot (or `null` for the first). Tells the reader the time range this snapshot summarizes.
- **`first raised:` dates** on "Open for the human" items track age across snapshots. Once an item is >24h old without resolution, lead the bullet with `STALE:` so the render script can flag it.
- **Delta mode** — when the previous snapshot is < 1h old and only acks/cursors/inbox-clearing happened since, set `delta_of:` + `unchanged_from_prev:` and write only the sections that changed. Cap delta body at 150 words. Full rules in `orchestrator/brief.md`.

---

## Mission snapshots vs digests

Both summarize feature state. Different audiences:

| Aspect    | `digest/` (repo agents write)                | `orchestrator/` (orchestrator writes)             |
|-----------|----------------------------------------------|---------------------------------------------------|
| Audience  | The next agent                               | The human                                         |
| Style     | Structured, dense, refs-heavy                | Prose, narrative, plain language                  |
| Cadence   | At session end or every ~10 log entries      | Triggered by each digest write (+ manual / bootstrap) |
| Coverage  | Everything an agent needs to resume work     | What the human needs to stay aligned              |

A snapshot may reference the latest digest by filename for the curious human, but stands alone otherwise.

---

## Scope amendments to `MISSION.md`

When the feature's goal or scope genuinely changes (not just progress against it):

1. The repo agent drops a `kind: pivot` log entry per the README protocol.
2. The orchestrator (or a human) edits `MISSION.md` to reflect the new scope.
3. Appends a one-liner under `## Amendments`: `2026-05-15 — orchestrator: dropped refresh-token rotation per pivot`.

This is the only routine edit to `MISSION.md`. It's a coordinated operation — pull before editing, push immediately after.

---

## Bootstrap

When creating a new feature folder:

From the shared-context repo root:

```bash
SLUG=<feature-slug>
mkdir -p features/$SLUG/{overview,repos,contracts,decisions,digest,log,cursors,orchestrator}
cp framework/templates/MISSION.md features/$SLUG/MISSION.md
# Then fill in the placeholders in features/$SLUG/MISSION.md.
# Then ask the orchestrator (or any agent in shared-context) to write the first snapshot:
#   "Bootstrap orchestrator snapshot for feature <slug>."
```

---

## How the human consumes Mission Control

```bash
open dashboard.html   # the cross-feature dashboard — "needs your attention" pinned to top
```

That's the whole interface. Everything else is for digging deeper:

```bash
cd features/<slug>
cat MISSION.md                                      # what we agreed to do
open orchestrator/$(ls orchestrator/ | sort | tail -1)  # latest snapshot in isolation
ls orchestrator/                                    # changelog (newest at bottom)
```

---

## Writing for agents (terseness rules)

Files under `log/`, `digest/`, `decisions/`, `contracts/`, `repos/<self>/`, `cursors/<self>/` are read by other agents in subsequent sessions. Every byte you write becomes context tokens someone has to pay for on resume. The orchestrator snapshot is the human-facing layer — these others are working artifacts.

**Rules**:

1. **Lead with the answer.** First sentence of the body should be the WHAT or the DECISION. Backstory comes after, if at all. Most readers stop after the first paragraph.
2. **Bullets over prose.** Prose is for human-facing files (`MISSION.md`, `orchestrator/`). Working files should be skimmable as lists.
3. **`summary:` field is mandatory.** One sentence, ≤ 30 words. This is what shows up in `_index.md` — make it count.
4. **Link, don't restate.** If a decision is already in `decisions/foo.md`, reference it by filename. Don't paraphrase the decision body.
5. **No throat-clearing.** Drop "Hi, just wanted to update you on…", "I've been thinking about…", "Here's a quick summary of…". Start with the substance.
6. **Target word counts per body** (enforced by `framework/bin/hook-lint.sh` — see below):
   - `log/` entries: 50–200 words (a one-paragraph note plus an optional bullet list).
   - `decisions/` ADRs: 100–300 words (decision + rationale + tradeoffs considered; not a full essay).
   - `contracts/<api>/` versions: as long as they need to be (schemas are schemas), but no commentary outside the schema. Not linted.
   - `repos/<self>/` status: 100–250 words; lean on tables/bullets.
   - `digest/` checkpoints: 400–800 words. Deep-audit doc; can be longer.
   - `cursors/<self>/`: just frontmatter + 1-line note (budget: 80 words).
   - `orchestrator/`: ≤500 words. The human-facing snapshot.
7. **Verbosity hurts you specifically.** The next agent reads YOUR files at session start. The longer they are, the more of the context budget gets spent re-loading what you already knew.

### Lint enforcement

`framework/bin/hook-lint.sh` runs as a `PreToolUse` hook on `Write` (per the install in `README.md` Step 1b). It checks every new file under `features/<slug>/` against the budgets above. Default mode is **warn** — the violation prints to stderr and the write proceeds. Set `SHARED_CONTEXT_LINT_MODE=block` to make the hook exit 2 instead; Claude Code then surfaces the message as a system reminder so the agent can re-plan before retrying.

**Opt-out for genuinely oversize artifacts** (e.g. an RFC-shaped `ask` whose precision is the point): make the first non-blank body line, immediately after the frontmatter, the comment

```
# allow-oversize: <one-line reason — e.g. "v2.1 scope RFC; corresponds to PR description">
```

The hook will skip the word-count check for that file. Reach for this sparingly — if you use it on a `log/`, the next agent still pays the read cost. Better to split into a `decisions/` ADR + a short `log/` pointer, or to put long-form content in the consuming repo's docs folder and `refs:` it from a short log.

### When to use prose

The orchestrator snapshot in `features/<slug>/orchestrator/` is allowed (encouraged) to use full sentences — it's the human's view. Keep it tight (~500 words max), but don't bullet-list it into uselessness.

### Retiring old entries

When a decision or contract is replaced, drop a **tombstone** sibling file (`<original-stem>.superseded.md`) with frontmatter only — no body. Agents will skip the original by default, and the dashboard's Browse section will badge it as superseded. This is how we honour the append-only invariant while pruning. See [`README.md` §5](./README.md#5-frontmatter-standards).
