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

## How the orchestrator runs (hook-triggered, two-tier)

See [`orchestrator/brief.md`](./orchestrator/brief.md) for the agent's full role definition. Operationally:

**Tier 1 — Render (cheap, fires often).**
A `PostToolUse` hook on `Write|Edit` in each repo's `.claude/settings.local.json` runs [`bin/hook-render.sh`](./bin/hook-render.sh). The hook filters to writes under `shared-context/features/` and calls [`bin/render-dashboard.mjs`](./bin/render-dashboard.mjs). Zero LLM cost, ~instant. Result: `dashboard.html` is always current with the latest raw state.

**Tier 2 — Orchestrator agent (slow, fires selectively).**
A second `PostToolUse` hook fires only on writes under `features/*/digest/`. Digest writes are the protocol's natural session-end milestone (see [`README.md` §4.3](./README.md#43-on-session-end-or-before-context-compaction)), so this is when synthesis is worth the cost. The hook invokes [`bin/hook-orchestrate.sh`](./bin/hook-orchestrate.sh), which runs `claude -p` headlessly with [`orchestrator/brief.md`](./orchestrator/brief.md) as the system prompt. The orchestrator writes a new `orchestrator/` snapshot and then triggers the render.

(Both scripts are in `framework/bin/` — the relative links above are from this doc's location inside `framework/`.)

---

## Snapshot format

```markdown
---
type: orchestrator-snapshot
author: orchestrator
at: 2026-05-15T14:30:00Z
covers_since: 2026-05-13T09-00-00-orchestrator.md   # prior snapshot, or null
status: on-track | at-risk | blocked | done
trigger: digest-hook | manual | bootstrap
trigger_digest: digest/2026-05-15T14-23-00-backend.md   # if trigger == digest-hook
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
- <question or decision needing human input>
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
6. **Target word counts per body**:
   - `log/` entries: 50–200 words (a one-paragraph note plus an optional bullet list).
   - `decisions/` ADRs: 100–300 words (decision + rationale + tradeoffs considered; not a full essay).
   - `contracts/<api>/` versions: as long as they need to be (schemas are schemas), but no commentary outside the schema.
   - `repos/<self>/` status: 100–250 words; lean on tables/bullets.
   - `digest/` checkpoints: 400–800 words. Deep-audit doc; can be longer.
   - `cursors/<self>/`: just frontmatter + 1-line note.
7. **Verbosity hurts you specifically.** The next agent reads YOUR files at session start. The longer they are, the more of the context budget gets spent re-loading what you already knew.

### When to use prose

The orchestrator snapshot in `features/<slug>/orchestrator/` is allowed (encouraged) to use full sentences — it's the human's view. Keep it tight (~500 words max), but don't bullet-list it into uselessness.

### Retiring old entries

When a decision or contract is replaced, drop a **tombstone** sibling file (`<original-stem>.superseded.md`) with frontmatter only — no body. Agents will skip the original by default, and the dashboard's Browse section will badge it as superseded. This is how we honour the append-only invariant while pruning. See [`README.md` §5](./README.md#5-frontmatter-standards).
