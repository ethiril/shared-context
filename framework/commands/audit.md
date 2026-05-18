---
description: Full-history audit of a shared-context feature
argument-hint: <feature-slug>
model: claude-opus-4-7
---

Full audit of feature **$ARGUMENTS**. Protocol: `framework/README.md` §2 → Full audit.

**Format note (see README §7):** Logs live in `log/*.dsl` (one event per file, retirement via `[pv]` `supersedes:`) and legacy `log/*.md`. Repo statuses are `<iso>.positional` + legacy `.md`. Contracts are `<iso>-<repo>-v<X.Y.Z>.dsl` + legacy `.md`. Audit reads everything regardless of format.

**Audit differs from `/catch-up`:**
- Reads every log/decision/contract version newer than your cursor, **regardless of `to:`**.
- **Includes `status: superseded` entries, tombstones, and DSL entries retired by a later `[pv]`'s `supersedes:`.**
- **No soft token budget.**

**Steps:**

1. Run the `/catch-up` read list first.
2. Read every entry in `features/$ARGUMENTS/{log,decisions,contracts/<api>,digest}/` newer than your cursor — including superseded. For DSL log: every `.dsl` file in `log/` whose filename timestamp (or `@at:`) is newer than the cursor (including ones retired by later `[pv]`s — that's the supersession chain you're auditing).
3. For each tombstone (`*.superseded.md`), also read the original it points at — needed to reconstruct the supersession chain. For pivot retirements, read both the `[pv]` entry and every entry it supersedes.

**Report:** summarise the supersession chain (retired → replacement) across both YAML tombstones and DSL pivots, call out inconsistencies, then say what prompted the audit.
