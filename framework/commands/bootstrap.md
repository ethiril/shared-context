---
description: Bootstrap a new shared-context feature folder
argument-hint: <feature-slug>
---

You are bootstrapping a new shared-context feature: **$ARGUMENTS**.

(Your repo's `CLAUDE.md` declares the absolute path to your shared-context folder — use that everywhere "shared-context root" is mentioned below.)

Steps (run in this order):

1. **Scaffold the folder structure** from the shared-context repo root:
   ```bash
   mkdir -p features/$ARGUMENTS/{overview,repos,contracts,decisions,digest,log,tickets,cursors,orchestrator}
   cp framework/templates/MISSION.md features/$ARGUMENTS/MISSION.md
   ```

2. **Fill in `MISSION.md`**: ask the user (or use what you already know) for Goal, Scope in/out, Repos involved, and Success criteria. Edit `features/$ARGUMENTS/MISSION.md` directly — it's the one place humans edit by hand.

3. **Write the first overview snapshot**:
   `features/$ARGUMENTS/overview/<UTC-ISO-timestamp>-<your-repo>.md` with frontmatter `{type: overview, author: <your-repo>, at: <iso>, status: active, summary: <one sentence>}` and a body covering goal, in-scope, out-of-scope, repos involved, success criteria. (Overview frontmatter shape: `framework/README.md` §7 → overview.)

4. **Write your repo's first status** at `features/$ARGUMENTS/repos/<your-repo>/<UTC-ISO-timestamp>.md` — even if there's nothing to report yet ("not started; awaiting kick-off"). This gives future-you and other repos a brief to read.

5. **Trigger the first orchestrator snapshot** by asking the orchestrator session (or running `/refresh $ARGUMENTS` there) to write `features/$ARGUMENTS/orchestrator/<UTC-ISO-timestamp>-orchestrator.md` with `trigger: bootstrap`.

After all of that, confirm what you scaffolded and what the next concrete step is.
