---
description: Resume work on a shared-context feature — load state, clear inbox, continue
argument-hint: <feature-slug>
model: claude-opus-4-7
---

Resume on feature **$ARGUMENTS**. Light state-load → apply pivots → pull inbox → respond.

**Use `/catch-up` instead** if you've been away long enough that you need a deep read (decisions, contracts, full `_index.md`). `/resume` is the light-touch default.

### Hard rules

- **Never respond to an `[ak]` ack.** Acks are terminal — observe it, let the cursor advance, don't write back. This applies even when the ack is your first inbox item after `/join`.
- **Never write into another repo's `repos/<them>/`.** Use a `log/` entry with `to: [<them>]`.
- **Never write into `overview/`.** Deprecated; MISSION.md + amendments is the single source of feature identity.

**Once-per-session (skip if loaded):** `framework/README.md`, `AGENTS.md` → identify yourself from CWD.

**Format-protocol skip rule:** Check `shared_context_framework_version` in your repo's `<CWD>/.claude/settings.local.json` (**not** `~/.claude/settings.local.json`). If it equals **2** (current — declared at README §7's `FRAMEWORK_VERSION`), use the format note below and skip re-reading §7. If missing/lower, read §7 in full, then bump the field. If higher, your slash command is out of date — flag to user.

**Format note (≈ README §7, v2):** Logs are per-event DSL files in `log/` (`<iso>-<repo>-<slug>.dsl`, one line: `from > to [kind] @at: summary | refs | body`). Repo statuses are `<iso>.positional`. Contracts are `<iso>-<repo>-v<X.Y.Z>.dsl`. Legacy `*.md`+YAML still parses.

### 1. Load state (light)

Read in order, stop when you have enough:

1. `features/$ARGUMENTS/MISSION.md` — feature identity.
2. Latest file in `features/$ARGUMENTS/orchestrator/` — your checkpoint. Treat everything older than its `at:` as absorbed. Fall back to newest `digest/` if no snapshot.
3. `features/$ARGUMENTS/cursors/<self>/current.md` — your bookmark (`last_log_read`, `last_pivot_read`, etc). Legacy fallback: latest timestamped file. No cursor: treat everything newer than the checkpoint's `at:` as new.
4. `features/$ARGUMENTS/repos/<self>/` newest file (`.positional`, fallback `.md`) — your task brief.

Default skips apply (README §2).

### 2. Apply pivots first

Scan `features/$ARGUMENTS/log/*.dsl` (+ legacy `*.md`) for `[pv]` entries newer than your checkpoint. **Apply each before anything else** — they may retire inbox items, your task brief, or contracts. Pivot follow-up is `[ch]` (abandon vs continue), not `[ak]`. State shift → fresh `repos/<self>/<iso>.positional`.

### 3. Watch for in-session pivot triggers

Scan the **current conversation** for signals that *this session* is itself a pivot (scope shifted, signed contract no longer right, core assumption broke). If so, propose `/pivot $ARGUMENTS <reason>` now — don't proceed until resolved.

### 4. Pull inbox

Read `log/*.dsl` (+ legacy `*.md`). An entry is in your inbox where **all** hold:

- `@at:` newer than `cursor.last_log_read` (or checkpoint `at:` if no cursor).
- `to` includes you OR is `all`.
- Not retired by a later `[pv]`'s `supersedes:`.

### 5. Auto-ack `[fy]`; drop `[ak]` silently

For each `[fy]` (fyi), write one auto-ack **without asking** — `[fy]` is absorptive. Path: `log/<UTC-ISO>-<self>-ack-<short-slug>.dsl`. Grammar:

```
<self> > <inbound-from> [ak] @<iso>: Acknowledged: <2-5 word recap>. | refs: <inbound-filename-or-@at> | <empty, or 1-sentence follow-up note>
```

For each `[ak]` of one of your prior events: **don't write anything.** Observe; cursor advances in step 9.

### 6. Report substantive inbox (don't write yet)

For every remaining entry (`[q]`, `[bl]`, `[cc]`, `[ch]`, `[tk]`), render a compact table. Block-worthy (`q`-ask / `bl` / `cc`) sort to top; conversational (`q`-question / `tk` / `ch`) to bottom.

```
| # | kind            | block? | from              | summary                | suggested response       |
|---|-----------------|--------|-------------------|------------------------|--------------------------|
| 1 | ask             | yes    | subscriptions-gw  | <summary>              | answer (substantive)     |
| 2 | contract-change | yes    | app-gateway       | <summary>              | ack + update consumer    |
| 3 | question        | no     | app-gateway       | <summary>              | answer when convenient   |
| 4 | change          | no     | app-gateway       | <summary>              | ack only                 |
```

`block?` from kind: `q`-ask / `bl` / `cc` → yes; `q`-question (judged by tone) / `ch` / `tk` → no.

### 7. Confirm responses

**1–4 substantive items:** call `AskUserQuestion` once with one question per row. Header: kind + sender. Options (≤ 4, recommended first per kind):

- **Answer** — substantive `[a]`. *Recommended for* `q`-ask / `bl`.
- **Change** — code change first, then `[ch]` (or `[cc]` if publishing new contract version) referencing inbound. *Recommended when* a `ch` / `cc` affects your code.
- **Ack** — short `[ak]`; body = what you're doing about it. *Recommended for* `ch` / `tk` you're aware of but not touching.
- **Skip** — defer; nothing written. *Use for* non-blocking `q`-question when heads-down.

**≥ 5 items:** skip `AskUserQuestion` (caps at 4). One-line proposal per row + a single "go ahead?" prompt.

**Wait for answers before writing.** Honour "Other → redirect to X".

### 8. Write substantive responses

One file per response at `log/<UTC-ISO>-<self>-<short-slug>.dsl`:

- **Answer** → `[a]`. `<self> > <inbound-from> [a] @<iso>: <one-sentence summary> | refs: <inbound> | <body 50–200 words>`.
- **Change** → make the code change first, then `[ch]`. New contract version → `[cc]` + write `contracts/<api>/<iso>-<self>-v<version>.dsl`.
- **Ack** (substantive) → `[ak]` with 1–3 sentences flagging follow-ups.
- **Skip** → don't write; cursor still advances past in step 9.

**Pivot follow-ups** (`[pv]` from step 2): right response is `[ch]`, not `[ak]`. If user picked Ack for a pivot row, flag it.

### 9. Update cursor

Overwrite `cursors/<self>/current.md`:

- `at:` — now (ISO with colons).
- `last_log_read` — latest log entry processed (filename or `@at:`).
- `last_pivot_read` — latest `[pv]` acknowledged, or `null`.
- `last_checkpoint_read` — orchestrator snapshot filename from step 1.
- `contracts_synced` — per-API version file you're synced against.
- `last_decision_read` — latest decision file read.

Body: one short line.

### 10. Wrap up

One sentence: auto-acks (count), substantive responses (count + slugs), whether `repos/<self>/` needs refreshing, whether to `/handoff` now or keep working.

**Budget ≤ 5k tokens.** If inbox is bigger or state-load is stale, `/catch-up` fits better.
