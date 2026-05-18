---
description: Close out a shared-context feature (mark done or paused)
argument-hint: <feature-slug> [done|paused] <one-line reason>
model: claude-opus-4-7
---

Close feature **$ARGUMENTS**.

`$ARGUMENTS` shape: `<slug> [done|paused] <reason>`. Default state is `done`.

**Format note (see README §7):** MISSION and closing digest are YAML+body — no DSL writes. But the pre-check spans both DSL (`log/log.dsl`) and legacy `log/*.md` when sweeping for unresolved items.

**Pre-check:** read the latest orchestrator snapshot (or `MISSION` + latest digest if no snapshot). Surface any unresolved "Open for the human" items or unmerged work to the user; ask whether to proceed before writing. Unmerged-work sweep should include open asks in `log/log.dsl` (kind `[q]` / `[bl]`) and legacy `log/*.md` (`kind: ask` / `kind: blocker`).

**Two writes, in order.**

### 1. Flip `MISSION.md` status

Edit `features/<slug>/MISSION.md` frontmatter: `status: done` (shipped, archived) or `status: paused` (parked, can resume later).

Do **not** rewrite the body. MISSION captures what you agreed to do; that doesn't change retroactively. If goal shifted mid-project, that should have been a `/pivot`.

### 2. Closing digest

Write `features/<slug>/digest/<UTC-ISO-timestamp>-<your-repo>.md`:

```yaml
---
type: digest
kind: closing
from: <your-repo>
at: <ISO with colons>
summary: <one sentence, ≤ 30 words — what was closed and why>
refs: [<final PRs, decisions, contracts>]
---
```

Body must cover:

- **What shipped** — concrete, with refs.
- **What didn't** — and why; what a resumer would need to know.
- **Where the work lives now** — merged PRs, deploys, follow-up tickets.
- **Open threads** — anything tracked elsewhere from here.
- For `paused`: **what would unblock resuming.**

Timestamp via `date -u +"%Y-%m-%dT%H-%M-%S"` (filenames); ISO with colons in frontmatter `at:`.

The digest write triggers any installed orchestrator hook → fresh snapshot + dashboard. The feature moves to the dashboard's **Archived** section.

**Confirm:** what was closed, link the closing digest filename, and — for `paused` — restate the unblock condition.
