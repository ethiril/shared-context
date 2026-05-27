---
description: Catch-up resume on a shared-context feature (new session or after a break)
argument-hint: <feature-slug>
model: claude-opus-4-7
---

Catch-up on feature **$ARGUMENTS**. Protocol: `framework/README.md` §2 + this file. Reports state + next action; doesn't write inbox responses (use `/resume` for that).

**Format-protocol skip rule:** Check `shared_context_framework_version` in your repo's `<CWD>/.claude/settings.local.json` (**not** `~/.claude/settings.local.json`). If it equals **3** (current — declared at README §7's `FRAMEWORK_VERSION`), use the format note below and skip re-reading §7. If missing/lower, read §7 in full, then bump the field.

**Format note (≈ README §7, v3):** Logs are per-event `.dsl` in `log/` (one DSL line each). Repo statuses are `<iso>.positional`. Contracts are `<iso>-<repo>-v<X.Y.Z>.dsl`. Two rolling file indexes (v3): `globals/<project>/repos/<repo>/files.dsl` (`path | sha256:12 | @iso by repo: desc | keywords:…`) and `features/<slug>/repos/<repo>/touched.dsl` (`path | @iso: why-for-this-feature`); lookup/record protocol is README §2. Legacy `*.md`+YAML still parses.

### Read order — lead with the index, drill down as needed

1. **`features/$ARGUMENTS/_index.md` first.** Generated. Contains: mission status + checkpoint pointer + excerpts from the latest snapshot's Headline + Open for the human + Next up + Where each repo stands + recent decisions (last 5) + last 4 log entries + last 1 digest + latest positional per repo. ~85% of catch-up needs in ~2K bytes.
2. `features/$ARGUMENTS/MISSION.md` — feature identity. Skip if already loaded this session. **If frontmatter has `project: <id>`,** also read `globals/<id>/PROJECT.md` + `globals/<id>/_index.md` once per session. **Never bulk-load** entry files — pull specific entries only when the catch-up surfaces a task that hits matching keywords (README §2).
3. Latest file in `features/$ARGUMENTS/orchestrator/` — **conditional**. Skip if `_index` excerpts answered everything. Open only for sections `_index` doesn't embed (e.g. `What shipped since the last snapshot`, `Decisions made`) or if a referenced filename in the excerpts needs broader context.
4. `features/$ARGUMENTS/cursors/<self>/current.md` (rolling). Fall back to latest timestamped file if missing.
5. `features/$ARGUMENTS/repos/<self>/` latest positional — your task brief.
6. **Drill down as `_index` guides:**
   - Log entries newer than `cursor.last_log_read` that `_index` flagged (asks `to:` you, pivots, contract-changes affecting your code). Skip ones already summarised.
   - For each API surface you'll actually touch: latest `contracts/<api>/*.dsl` (or legacy `.md`).
   - Decisions newer than `cursor.last_decision_read` with `status: accepted` — open only the ones `_index` suggests are relevant. Don't read every ADR.
7. **Git state (one call, bounded).** Run `git status --short && git branch --show-current` once. Stop there — don't dig into `git log`, branch history, or remote state unless an inbox item specifically calls for it. The goal is orientation, not investigation.

Default skips apply (README §2).

**Watch for in-session pivot triggers.** Before reporting state, scan the current conversation: if direction has materially shifted, propose `/pivot $ARGUMENTS <reason>` first.

Budget ≤ 5k tokens. Report state + next action.
