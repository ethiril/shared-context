---
description: Bootstrap a new shared-context feature folder
argument-hint: <feature-slug>
---

Bootstrap new feature **$ARGUMENTS**.

**Format note (see README §7):** `log/`, `repos/`, `contracts/` use compact formats (DSL / positional / DSL). Everything else (MISSION, overview, decisions, digest, orchestrator, cursor) stays YAML+body.

**Steps (in order):**

1. Scaffold from the shared-context root:
   ```bash
   mkdir -p features/$ARGUMENTS/{overview,repos,contracts,decisions,digest,log,tickets,cursors,orchestrator}
   cp framework/templates/MISSION.md features/$ARGUMENTS/MISSION.md
   ```
   `log/` starts empty — each event is written as its own file `<iso>-<repo>-<slug>.dsl` (single DSL line).

2. Fill `features/$ARGUMENTS/MISSION.md` — Goal / Scope in+out / Repos / Success criteria. Ask the user for anything unclear. This is the one file humans edit by hand.

3. Write the first overview at `features/$ARGUMENTS/overview/<UTC-ISO-timestamp>-<your-repo>.md` (YAML+body). Frontmatter: `{type: overview, author: <your-repo>, at: <iso>, status: active, summary: <one sentence>}`. Body: goal, in/out scope, repos, success criteria. Shape: `framework/README.md` §7 → overview.

4. Write your repo's first status as a **positional** record: `features/$ARGUMENTS/repos/<your-repo>/<UTC-ISO-timestamp>.positional`. Single line, field separator `|`, list separator `~`. Schema (9 fields, 8 pipes — see README §7 → repo status):
   ```
   repo|at|summary|current_goal|done|next|blocked_on|contracts_in_play|open_questions
   ```
   `done`, `next`, `blocked_on` are plain `~`-separated lists — empty = blank between pipes. `contracts_in_play` and `open_questions` are inline JSON — empty = `[]` (a blank field is a parse error). Minimal bootstrap-state line (everything empty but `summary` + `current_goal`):
   ```
   <repo>|<iso>|Bootstrapped; awaiting kickoff|<one-sentence goal>||||[]|[]
   ```
   Eyeball the pipe count before you save: 8 pipes, no more.

5. Trigger first orchestrator snapshot — ask the orchestrator session (or run `/refresh $ARGUMENTS` there) to write `features/$ARGUMENTS/orchestrator/<UTC-ISO-timestamp>-orchestrator.md` with `trigger: bootstrap` (YAML+body).

**Confirm** what you scaffolded and the next concrete step.
