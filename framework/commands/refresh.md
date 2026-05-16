---
description: Refresh Mission Control — write a fresh orchestrator snapshot + dashboard + index
argument-hint: <feature-slug>
---

You are refreshing Mission Control for feature **$ARGUMENTS**.

This is the **primary way snapshots get written.** No hook fires automatically by default — the human runs `/refresh` when they want the synthesised view to update. Use it after a digest, before a check-in with the human, when direction has shifted, or any time the dashboard feels stale.

The work runs **in this session** (not headless), so you can ask the user tight yes/no questions before writing.

(Your repo's `CLAUDE.md` declares the absolute path to the shared-context folder — use that everywhere "shared-context root" is mentioned below.)

## Steps

### 1. Adopt the orchestrator role for this command

Read `framework/orchestrator/brief.md` from the shared-context root. **For the duration of `/refresh` you write as the `orchestrator` identity, not your repo's identity.** You only write to `features/<slug>/orchestrator/<timestamp>-orchestrator.md` (and `MISSION.md` for amendments — see step 5). Do not touch `log/`, `repos/<self>/`, `decisions/`, `contracts/`, or `digest/` during a refresh.

### 2. Read the inputs

Per the brief's "What you read" section. In order:
1. `features/$ARGUMENTS/MISSION.md`
2. `features/$ARGUMENTS/orchestrator/` — your previous snapshot (latest file)
3. `features/$ARGUMENTS/digest/` — latest digest per repo
4. `features/$ARGUMENTS/repos/<repo>/` — latest status per repo
5. `features/$ARGUMENTS/log/` — entries newer than your previous snapshot
6. `features/$ARGUMENTS/decisions/` — newer than your previous snapshot
7. `features/$ARGUMENTS/contracts/<api>/` — only if a digest mentions a version change

Soft budget: ≤ ~8k tokens. If a single feature would exceed that, read MISSION + latest digest + latest repo statuses only and say so in the snapshot.

### 3. Decide: delta or full snapshot?

Look at the previous snapshot's `at:` timestamp:

- **Previous snapshot < 1h old AND only acks/cursors/inbox-clearing happened since** → write a **delta snapshot**. Frontmatter includes `delta_of: <previous-filename>` and `unchanged_from_prev: [<sections>]`. Body covers only what's new — typically just "What shipped since the last snapshot" and any changed "Open for the human" items. Skip restating settled state.
- **Otherwise** → write a **full snapshot** per the format in `framework/CONVENTIONS.md`.

This is the main efficiency lever. Don't write a full snapshot just because the hook would have.

### 4. Surface pending human decisions concisely (via AskUserQuestion)

Before writing, scan the inputs for things that **require a human call** and pose them as `AskUserQuestion` prompts — one question per item, ≤4 options, each option ≤1 sentence. Examples that warrant asking:

- A `kind: pivot` log newer than the latest `MISSION.md` amendment → ask: "Amend MISSION.md scope for the `<pivot-summary>` pivot?" (Yes, append amendment / No, leave as-is / Defer to next refresh)
- A path rename in a published contract that diverges from MISSION.md's `Scope` section → ask whether to amend
- A decision marked `status: superseded` in a log without a sibling tombstone → ask whether to tombstone
- An "Open for the human" item from the previous snapshot that has been there >24h with no change → ask whether to escalate or drop

**Do not invent questions to fill space.** If nothing genuine is pending, skip this step and proceed to write. The human will read the snapshot; they don't need to be poked unless something needs a call.

If the user answers in a way that requires a follow-up edit (e.g. "Yes, amend MISSION"), perform that edit before writing the snapshot, so the snapshot can reference it.

### 5. Optional MISSION.md amendment

This is the only file outside `orchestrator/` you may edit. Append a one-line entry under `## Amendments`:

```
- YYYY-MM-DD — orchestrator: <one-line summary of the change, ref the source filename>
```

If a pivot fundamentally changes Goal or Scope, also edit those sections — minimal and surgical. Note the amendment in the snapshot's "Decisions made" section.

### 6. Write the snapshot

`features/$ARGUMENTS/orchestrator/<UTC-ISO-timestamp>-orchestrator.md`. Get the timestamp with `date -u +"%Y-%m-%dT%H-%M-%S"`. Frontmatter `trigger: manual`. Body per the format in `framework/CONVENTIONS.md`, ≤500 words.

For "Open for the human" items: include a `first_raised:` date inline next to each item if it's been carried over from a prior snapshot (`<item> — first raised 2026-05-15`). Drop items that have been resolved.

### 7. Render

```bash
node framework/bin/render-dashboard.mjs
```

Run from the shared-context root. This regenerates `dashboard.html` and per-feature `_index.md`.

### 8. Confirm

In one sentence each: which file you wrote, what (if anything) was newly surfaced for the human, and whether you amended `MISSION.md`. No re-narration of the snapshot body — the user can read it.

## Notes

- Refresh writes are cheap to do often, especially in delta mode. If in doubt after a digest or major log entry, refresh — the human reads `dashboard.html` between sessions and benefits.
- If you're a repo agent reading this and the user said "refresh," it's fine to run it from a repo session — the CWD doesn't matter, only that you write to the right paths under the shared-context root. Switch identity to `orchestrator` for this command, then switch back.
