---
description: Close out a shared-context feature (mark done or paused)
argument-hint: <feature-slug> [done|paused] <one-line reason>
---

You are closing shared-context feature: **$ARGUMENTS**.

The first whitespace-separated token in $ARGUMENTS is the feature slug. The second is `done` (default) or `paused`. The rest is a one-line reason.

(Your repo's `CLAUDE.md` declares the absolute path to your shared-context folder.)

**Before you do anything**, read the feature's latest orchestrator snapshot (or MISSION + latest digest if no snapshot). Closing a feature with unresolved "Open for the human" items or unmerged work is usually a mistake — if you see any, surface them to the user and ask whether to proceed.

Two writes, in this order:

### 1. Flip MISSION.md status

Edit `features/<slug>/MISSION.md` frontmatter:

- `status: done` (shipped, archived) or `status: paused` (parked, can resume later)

Do **not** rewrite the body. MISSION captures what you agreed to do; that doesn't change retroactively. If the goal shifted mid-project you should have used `/pivot`.

### 2. Closing digest

Write `features/<slug>/digest/<UTC-ISO-timestamp>-<your-repo>.md` summarising the wrap. Frontmatter:

```yaml
---
type: digest
kind: closing
from: <your-repo>
at: <ISO with colons>
summary: <one sentence, ≤ 30 words — what was closed and why>
refs: [<any final PRs, decisions, contracts>]
---
```

Body should cover:

- **What shipped** — concretely, with refs.
- **What didn't** — and why; what someone resuming would need to know.
- **Where the work lives now** — merged PRs, deploys, follow-up tickets.
- **Open threads** — anything the team should track elsewhere from here on.
- For `paused`: **what would unblock resuming.**

Get the timestamp with `date -u +"%Y-%m-%dT%H-%M-%S"`. Use that in filenames; in frontmatter `at:` use ISO with colons.

The digest write triggers the orchestrator hook (Tier-2, if installed) → a final orchestrator snapshot picking up the new MISSION status → fresh `dashboard.html`. If only Tier-1 (render) is installed, the dashboard still picks up the MISSION status directly. Either way, the feature moves to the dashboard's **Archived** section.

### Confirm

After both writes, tell the user what you closed out, link the final state (dashboard + closing digest filename), and — for `paused` — restate what would unblock resuming.
