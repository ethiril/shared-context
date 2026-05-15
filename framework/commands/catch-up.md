---
description: Catch-up resume on a shared-context feature (new session or after a break)
argument-hint: <feature-slug>
---

You are catching up on shared-context feature: **$ARGUMENTS**.

Follow the Catch up protocol from your shared-context folder's `framework/README.md` §4.1. (Your repo's `CLAUDE.md` declares where shared-context lives.)

Steps:

1. Run the Quick resume read list (see `/resume` or §4.1 Quick resume) — `MISSION.md`, latest orchestrator snapshot, post-snapshot pivots, your repo's latest status, asks `to:` you.
2. Read `features/$ARGUMENTS/_index.md` — generated index of every entry with summaries. Skim this rather than opening individual files.
3. Read `features/$ARGUMENTS/cursors/<your-repo>/` — latest file (what you previously synced against).
4. For each API surface you'll touch, read `features/$ARGUMENTS/contracts/<api>/` latest file (skip versions marked `status: superseded` or tombstoned).
5. Read `features/$ARGUMENTS/decisions/` files newer than your cursor's `last_decision_read`, with `status: accepted` (skip superseded).
6. Read `features/$ARGUMENTS/log/` entries newer than max(latest snapshot's `at`, cursor's `last_log_read`).

**Default skip rule**: ignore `status: superseded` and tombstoned files. Use `/audit $ARGUMENTS` if you need to read them.

Soft budget: ≤ 5k tokens. After reading, tell me what state you found and what you want to do next.
