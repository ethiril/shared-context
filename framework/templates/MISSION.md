---
type: mission-root
feature: <slug>
status: active
created_at: <YYYY-MM-DDTHH:MM:SSZ>
created_by: <repo>
---

# Mission Control — <feature-slug>

This file captures **what we agreed to do**. For **where we are right now**, open `dashboard.html` at the repo root, or the latest file in [`orchestrator/`](orchestrator/) (see footer).

## Goal

<One paragraph. Why are we doing this? What does shipping look like?>

## Scope

**In**
- <bullet>
- <bullet>

**Out**
- <bullet>
- <bullet>

## Repos involved

- `<repo>` — <role in this feature>
- `<repo>` — <role in this feature>

## Success criteria

- <measurable outcome>
- <measurable outcome>

## Amendments

<!-- Append a dated one-liner here only when scope genuinely changes. See CONVENTIONS.md. -->

---

## How to read this folder (for humans)

```bash
open ../../dashboard.html                                # cross-feature dashboard
cat MISSION.md                                           # what we agreed to do
open orchestrator/$(ls orchestrator/ | sort | tail -1)   # latest orchestrator snapshot
ls orchestrator/                                         # changelog — newest at the bottom
```

Deeper layers (mostly agent-targeted):

- `log/` — raw cross-repo messages
- `digest/` — agent checkpoints (dense, machine-targeted)
- `decisions/` — ADRs explaining non-obvious choices
- `contracts/` — versioned API surfaces
- `repos/<repo>/` — per-repo status snapshots
