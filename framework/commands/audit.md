---
description: Full-history audit of a shared-context feature
argument-hint: <feature-slug>
---

You are performing a full audit of shared-context feature: **$ARGUMENTS**.

Follow the Full audit protocol from your shared-context folder's `framework/README.md` §4.1. (Your repo's `CLAUDE.md` declares where shared-context lives.)

This is the only resume mode that:
- Reads every log/decision/contract version newer than your cursor regardless of `to:` filters.
- **Includes `status: superseded` entries and tombstoned files** — the audit needs the full history.
- Does not respect the soft token budget.

Steps:

1. Run the Catch up read list first (see `/catch-up`).
2. Read every file in `features/$ARGUMENTS/log/`, `decisions/`, `contracts/<api>/`, and `digest/` newer than your cursor — including superseded.
3. For each tombstone (`*.superseded.md`), also read the original it points at so you can reconstruct the supersession chain.

After reading, summarise the supersession chain (what was retired and what replaced it) and call out anything that looks inconsistent. Then tell me what specifically prompted the audit.
