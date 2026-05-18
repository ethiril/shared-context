---
description: Refresh Mission Control — write a fresh orchestrator snapshot + dashboard + index
argument-hint: <feature-slug>
model: claude-opus-4-7
---

Refresh Mission Control for feature **$ARGUMENTS**.

`/refresh` is the **primary way snapshots get written** — no hook fires automatically by default. Run after a digest, before a check-in with the human, when direction has shifted, or when the dashboard feels stale. Runs in-session, so you can ask tight yes/no questions before writing.

### 1. Adopt orchestrator role

Read `framework/orchestrator/brief.md`. For `/refresh` you write as `orchestrator`, not your repo. You only write to `features/<slug>/orchestrator/<timestamp>-orchestrator.md` (and `MISSION.md` for amendments — step 5). Do **not** touch `log/`, `repos/<self>/`, `decisions/`, `contracts/`, `digest/`.

### 2. Read inputs (per the brief)

**Format note (see README §7):** Inputs span DSL (`log/log.dsl`, `repos/<repo>/*.positional`, `contracts/<api>/*.dsl`) and YAML (`MISSION.md`, `orchestrator/`, `digest/`, `decisions/`, legacy `.md` siblings of any of the above). Read both shapes; filter by the same fields.

1. `features/$ARGUMENTS/MISSION.md` (YAML).
2. Previous snapshot — `features/$ARGUMENTS/orchestrator/` latest file (YAML).
3. Latest digest per repo — `features/$ARGUMENTS/digest/` (YAML).
4. Latest status per repo — `features/$ARGUMENTS/repos/<repo>/` latest `.positional` (fallback: legacy `.md`).
5. Log entries newer than previous snapshot — lines in `features/$ARGUMENTS/log/log.dsl` (newer than snapshot `at:`) **plus** legacy `log/*.md`. Treat retired-by-`[pv]` lines as out of scope.
6. Decisions newer than previous snapshot — `features/$ARGUMENTS/decisions/` (YAML).
7. Contracts — only if a digest mentions a version change. `.dsl` or legacy `.md`.

Budget ≤ ~8k tokens. If a single feature exceeds, read MISSION + latest digest + latest repo statuses only and say so in the snapshot.

### 3. Delta or full snapshot?

| Previous snapshot | Activity since | → Write |
|---|---|---|
| < 1h old | only acks/cursors/inbox-clearing | **delta**: frontmatter has `delta_of: <prev-filename>` and `unchanged_from_prev: [<sections>]`; body covers only what's new |
| otherwise | — | **full**, per `framework/CONVENTIONS.md` |

Main efficiency lever. Don't write a full snapshot just because the hook would have.

### 4. Surface pending decisions (AskUserQuestion)

Scan inputs for items requiring a human call. Ask one question per item, ≤ 4 options, each option ≤ 1 sentence. Trigger examples:

- `kind: pivot` newer than latest `MISSION.md` amendment → "Amend MISSION scope for `<pivot>`?"
- Contract path rename diverges from `MISSION` scope → ask about amending
- Decision `status: superseded` in a log without a sibling tombstone → ask whether to tombstone
- "Open for the human" item > 24h with no change → escalate or drop

**Don't invent questions.** If nothing genuine is pending, skip and write.

If the user's answer requires a follow-up edit (e.g. "Yes, amend MISSION"), do that edit before writing the snapshot so it can reference it.

### 5. Optional MISSION.md amendment

Only file outside `orchestrator/` you may edit. Append under `## Amendments`:

```
- YYYY-MM-DD — orchestrator: <one-line summary, ref source filename>
```

If a pivot fundamentally changes Goal or Scope, also edit those sections — minimal and surgical. Note the amendment in the snapshot's "Decisions made".

### 6. Write the snapshot

`features/$ARGUMENTS/orchestrator/<UTC-ISO-timestamp>-orchestrator.md` (timestamp: `date -u +"%Y-%m-%dT%H-%M-%S"`). Frontmatter `trigger: manual`. Body per `framework/CONVENTIONS.md`, ≤ 500 words.

**"Open for the human"**: include inline `first_raised:` date if carried over from a prior snapshot (`<item> — first raised 2026-05-15`). Drop resolved items.

### 7. Render

```bash
node framework/bin/render-dashboard.mjs
```

Run from shared-context root. Regenerates `dashboard.html` and per-feature `_index.md`.

### 8. Confirm

One sentence each: which file you wrote, what (if anything) was newly surfaced, whether you amended `MISSION.md`. No re-narration of the snapshot body.

## Notes

- Refresh writes are cheap — especially in delta mode. If in doubt after a digest or major log, refresh. The human reads `dashboard.html` between sessions.
- Repo-session invocation is fine — CWD doesn't matter, only that writes go to the right paths. Switch identity to `orchestrator` for `/refresh`, then back.
