---
description: Quick resume on a shared-context feature (after /clear or similar)
argument-hint: <feature-slug>
---

You are resuming work on shared-context feature: **$ARGUMENTS**.

Follow the Quick resume protocol from your shared-context folder's `framework/README.md` §4.1. (Your repo's `CLAUDE.md` declares where shared-context lives.)

Once-per-session (skip if you've already done these this session):
1. Read `framework/README.md` and `AGENTS.md` from your shared-context folder.
2. Identify yourself from your CWD.

Then for feature `$ARGUMENTS`:
1. Read `features/$ARGUMENTS/MISSION.md` — feature identity.
2. Read the latest file in `features/$ARGUMENTS/orchestrator/` (lexically last). **This is your checkpoint.** It's curated and current. Treat it as having absorbed every log, decision, and digest older than its `at:`.
3. Read `features/$ARGUMENTS/log/` entries with `kind: pivot` newer than the snapshot's `at:`. Pivots override anything they `supersedes`.
4. Read `features/$ARGUMENTS/repos/<your-repo>/` — latest file. That's your task brief.
5. Read `features/$ARGUMENTS/log/` entries whose `to:` includes your repo, newer than the snapshot.

**Default skip rule**: ignore any file with `status: superseded` in frontmatter, or with a sibling `*.superseded.md` tombstone. The orchestrator snapshot is your source of truth for what's still live.

If no orchestrator snapshot exists yet, fall back to the latest `digest/` file as the checkpoint.

Soft budget: ≤ 5k tokens of reads before doing real work. After reading, tell me in one paragraph what state you found and what you want to do next.
