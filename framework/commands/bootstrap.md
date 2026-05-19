---
description: Bootstrap a new shared-context feature folder
argument-hint: <feature-slug>
---

Bootstrap new feature **$ARGUMENTS**.

**Format note (see README §7):** `log/`, `repos/`, `contracts/` use compact formats (DSL / positional / DSL). Everything else (MISSION, decisions, digest, orchestrator, cursor) stays YAML+body.

### Hard rules

- **Do not create or write to `overview/`.** The folder is deprecated; MISSION.md + its `## Amendments` section is the single source of feature identity. The scaffold step below does not create `overview/`. Do not add it back.
- **Step 5 (first orchestrator snapshot) is mandatory.** Until that snapshot exists, `/catch-up` and `/resume` fall back to a degraded "no checkpoint" path. Do not skip it, even if the feature is "trivial."

**Steps (in order):**

0. **Ensure shared-context permissions + framework version marker** (one-time per repo). Read your repo's `CLAUDE.md` to find the *"Cross-repo coordination lives at …"* line — that absolute path is `<SHARED_CONTEXT_ROOT>`. Open `.claude/settings.local.json` in your CWD. Do both of the below; Edit the file as needed:

   **Permissions** — if `permissions.allow` doesn't already include both patterns below, add them (substitute `<SHARED_CONTEXT_ROOT>` with the literal path):
   - `Read(<SHARED_CONTEXT_ROOT>/**)` — read anywhere in shared-context
   - `Write(<SHARED_CONTEXT_ROOT>/features/**)` — write under `features/` only

   **Framework version marker** — set a top-level field: `"shared_context_framework_version": 2`. This tells future `/resume` and `/catch-up` sessions in this repo that you've absorbed README §7 at v2, so they can skip re-reading it. Bump the value when README §7 declares a new `FRAMEWORK_VERSION`.

   **Idempotent:** skip if both perm patterns (or broader equivalents like a bare `*`) and the version marker are already present. Don't remove existing narrower entries — additive only. If the file doesn't exist, create it with the two patterns under `permissions.allow`, an empty `deny: []`, and the version marker at the top level. After this step, shared-context reads/writes auto-approve without per-file prompts.

1. Scaffold from the shared-context root:
   ```bash
   mkdir -p features/$ARGUMENTS/{repos,contracts,decisions,digest,log,tickets,cursors,orchestrator}
   cp framework/templates/MISSION.md features/$ARGUMENTS/MISSION.md
   ```
   `log/` starts empty — each event is written as its own file `<iso>-<repo>-<slug>.dsl` (single DSL line).

2. Fill `features/$ARGUMENTS/MISSION.md` — Goal / Scope in+out / Repos / Success criteria. Ask the user for anything unclear. This is the one file humans edit by hand.

3. Write your repo's first status as a **positional** record: `features/$ARGUMENTS/repos/<your-repo>/<UTC-ISO-timestamp>.positional`. Single line, field separator `|`, list separator `~`. Schema (9 fields, 8 pipes — see README §7 → repo status):
   ```
   repo|at|summary|current_goal|done|next|blocked_on|contracts_in_play|open_questions
   ```
   `done`, `next`, `blocked_on` are plain `~`-separated lists — empty = blank between pipes. `contracts_in_play` and `open_questions` are inline JSON — empty = `[]` (a blank field is a parse error). Minimal bootstrap-state line (everything empty but `summary` + `current_goal`):
   ```
   <repo>|<iso>|Bootstrapped; awaiting kickoff|<one-sentence goal>||||[]|[]
   ```
   Eyeball the pipe count before you save: 8 pipes, no more.

4. Announce the feature — write a `[fy]` DSL line as one file: `features/$ARGUMENTS/log/<UTC-ISO-timestamp>-<your-repo>-bootstrap.dsl`. Grammar (README §7 → log entries):
   ```
   <your-repo> > all [fy] @<iso-with-colons>: Feature bootstrapped — <one-line invitation>. | refs: MISSION.md, repos/<your-repo>/<iso>.positional | <body — 15-40 words MAX>
   ```
   **Do not recap MISSION** — `refs:` already points at it. The body is for *delta* only: which other repos should `/join` (named), any time-sensitive context, any single critical gotcha. If you can't think of anything that isn't in MISSION, leave the body empty.

5. Write the first orchestrator snapshot inline. You **temporarily wear the orchestrator hat** for this single write (the only `author: orchestrator` line you'll author outside `/refresh`) — your repo identity stays the same everywhere else. Path: `features/$ARGUMENTS/orchestrator/<UTC-ISO-timestamp>-orchestrator.md`. Frontmatter `{type: orchestrator-snapshot, author: orchestrator, at: <iso-with-colons>, status: on-track, trigger: bootstrap, summary: <one sentence, ≤ 30 words>}`. Body ≤ 150 words: a `## Headline` paragraph saying "Feature bootstrapped — awaiting joins from <named repos>"; `## Where each repo stands` listing the founding repo + any expected joiners as "(joining)"; `## Open for the human` = `Nothing — heads-down on initial setup.`. Skip "What shipped" and "Decisions made" — nothing has yet. The bootstrap snapshot is intentionally minimal — `/refresh` rewrites it once substantive work lands.

6. Render the dashboard from the shared-context root:
   ```bash
   node framework/bin/render-dashboard.mjs
   ```
   Pure aggregation, no LLM cost. Single-line output. The dashboard now reflects the new feature with the bootstrap snapshot.

**Confirm** what you scaffolded (the file paths) and the next concrete step (usually: tell other repos to run `/join $ARGUMENTS`).

**Onboarding done.** This is the last time you'll run `/bootstrap` for this feature. Subsequent sessions in this repo use `/resume $ARGUMENTS` to continue work.
