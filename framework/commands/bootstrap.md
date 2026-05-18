---
description: Bootstrap a new shared-context feature folder
argument-hint: <feature-slug>
---

Bootstrap new feature **$ARGUMENTS**.

**Steps (in order):**

1. Scaffold from the shared-context root:
   ```bash
   mkdir -p features/$ARGUMENTS/{overview,repos,contracts,decisions,digest,log,tickets,cursors,orchestrator}
   cp framework/templates/MISSION.md features/$ARGUMENTS/MISSION.md
   ```

2. Fill `features/$ARGUMENTS/MISSION.md` — Goal / Scope in+out / Repos / Success criteria. Ask the user for anything unclear. This is the one file humans edit by hand.

3. Write the first overview at `features/$ARGUMENTS/overview/<UTC-ISO-timestamp>-<your-repo>.md`. Frontmatter: `{type: overview, author: <your-repo>, at: <iso>, status: active, summary: <one sentence>}`. Body: goal, in/out scope, repos, success criteria. Shape: `framework/README.md` §7 → overview.

4. Write your repo's first status: `features/$ARGUMENTS/repos/<your-repo>/<UTC-ISO-timestamp>.md` — even if it's "not started; awaiting kick-off."

5. Trigger first orchestrator snapshot — ask the orchestrator session (or run `/refresh $ARGUMENTS` there) to write `features/$ARGUMENTS/orchestrator/<UTC-ISO-timestamp>-orchestrator.md` with `trigger: bootstrap`.

**Confirm** what you scaffolded and the next concrete step.
