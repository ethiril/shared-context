---
description: Write a digest + cursor before /clear so the next session resumes cheaply
argument-hint: <feature-slug>
---

You are handing off shared-context feature **$ARGUMENTS** before a `/clear` or session end.

Follow the End-of-session protocol from your shared-context folder's `framework/README.md` §2 → Session end. (Your repo's `CLAUDE.md` declares where shared-context lives.)

Two writes, **in this order**:

### 1. Decide: digest now?

Count log entries newer than the latest `digest/<file>.md` (or all log entries if no digest exists). Then:

- **0 logs since last digest** — skip silently. Move to step 2.
- **1–4 logs** — usually skip; tell the user "n logs since last digest; not writing a new one." Move to step 2.
- **5–9 logs (borderline)** — call `AskUserQuestion` with one question:
  > Header: `"Write a digest?"`  
  > Options (recommended first based on what you observed this session):
  > - **Yes — write digest now (Recommended)** — substantial progress; the next agent benefits from a checkpoint.
  > - **No — just the cursor** — mostly acks/cleanup; logs cover the state adequately.
- **≥10 logs OR no digest exists** — write without asking.
- **Substantial code progress this session** — write without asking even if log count is low.

If you write a digest: place it at `features/$ARGUMENTS/digest/<UTC-ISO-timestamp>-<your-repo>.md`. Cover, per repo: current goal, what's done, what's next, what's blocked, contracts in play (by version), open cross-repo questions. Reference (don't restate) contracts and decisions in `refs:`. **Include a `summary:` field in frontmatter** — one sentence, ≤ 30 words. Body target: 400–800 words (lint hook caps at 800).

The digest write **does not** automatically refresh the dashboard — that's `/refresh <slug>` (command-driven by default). If your install has the opt-in `hook-orchestrate.sh`, a fresh snapshot will be written headlessly; otherwise the human runs `/refresh` when they want a synthesised view.

### 2. Cursor (always)

**Overwrite** `features/$ARGUMENTS/cursors/<your-repo>/current.md` (rolling — there is only one cursor file per repo per feature, edited in place each session-end). Set:
- `at:` — now, in ISO with colons (`date -u +"%Y-%m-%dT%H:%M:%SZ"`)
- `last_checkpoint_read` — the orchestrator snapshot filename you used (or the digest you just wrote, if no snapshot yet).
- `last_log_read` — latest log entry filename you processed.
- `last_pivot_read` — latest pivot you acknowledged (or `null`).
- `contracts_synced` — per-API version file you're synced against.
- `last_decision_read` — latest decision file you've read.

Body: one short line — what you'd want next-session-you to remember in ≤5 words. (Frontmatter does most of the work; the body is just a sticky note.)

If older timestamped cursor files exist from before this convention, leave them — they're history. Quick resume / Catch up reads `current.md` only.

After both writes, confirm to me what you wrote and what you'd resume with on next start. If you skipped the digest, say so explicitly so I know it was a deliberate call.
