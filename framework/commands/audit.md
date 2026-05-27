---
description: Full-history audit of a shared-context feature
argument-hint: <feature-slug>
model: claude-opus-4-7
---

Full audit of feature **$ARGUMENTS**. Protocol: `framework/README.md` §2 → Full audit.

**Format-protocol skip rule:** Check `shared_context_framework_version` in your repo's `<CWD>/.claude/settings.local.json` (**not** `~/.claude/settings.local.json`). If it equals **3** (the current version, declared at README §7's `FRAMEWORK_VERSION`), the format note below is a complete substitute and **you can skip re-reading §7 entirely.** If missing or lower, read §7 in full, then update the field to 3 in settings.

**Format note (≈ README §7, v3):** Logs live in `log/*.dsl` (one event per file, retirement via `[pv]` `supersedes:`) and legacy `log/*.md`. Repo statuses are `<iso>.positional` + legacy `.md`. Contracts are `<iso>-<repo>-v<X.Y.Z>.dsl` + legacy `.md`. The v3 file indexes (`globals/<project>/repos/<repo>/files.dsl`, `features/<slug>/repos/<repo>/touched.dsl`) are rolling agent memory — audit them only if a read-provenance question arises. Audit reads everything regardless of format.

**Audit differs from `/catch-up`:**
- Reads every log/decision/contract version newer than your cursor, **regardless of `to:`**.
- **Includes `status: superseded` entries, tombstones, and DSL entries retired by a later `[pv]`'s `supersedes:`.**
- **No soft token budget.**

**Steps:**

1. Run the `/catch-up` read list first.
2. Read every entry in `features/$ARGUMENTS/{log,decisions,contracts/<api>,digest}/` newer than your cursor — including superseded. For DSL log: every `.dsl` file in `log/` whose filename timestamp (or `@at:`) is newer than the cursor (including ones retired by later `[pv]`s — that's the supersession chain you're auditing).
3. For each tombstone (`*.superseded.md`), also read the original it points at — needed to reconstruct the supersession chain. For pivot retirements, read both the `[pv]` entry and every entry it supersedes.

**Report:** summarise the supersession chain (retired → replacement) across both YAML tombstones and DSL pivots, call out inconsistencies, then say what prompted the audit.
