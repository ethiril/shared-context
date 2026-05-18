---
description: Full-history audit of a shared-context feature
argument-hint: <feature-slug>
model: claude-haiku-4-5-20251001
---

Full audit of feature **$ARGUMENTS**. Protocol: `framework/README.md` §2 → Full audit.

**Audit differs from `/catch-up`:**
- Reads every log/decision/contract version newer than your cursor, **regardless of `to:`**.
- **Includes `status: superseded` entries and tombstones.**
- **No soft token budget.**

**Steps:**

1. Run the `/catch-up` read list first.
2. Read every file in `features/$ARGUMENTS/{log,decisions,contracts/<api>,digest}/` newer than your cursor — including superseded.
3. For each tombstone (`*.superseded.md`), also read the original it points at — needed to reconstruct the supersession chain.

**Report:** summarise the supersession chain (retired → replacement), call out inconsistencies, then say what prompted the audit.
