---
description: Resume work on a shared-context feature — load state, clear inbox, continue
argument-hint: <feature-slug>
model: claude-opus-4-7
---

Resume on feature **$ARGUMENTS**. Picks up where you left off, clears your inbox, and gets you ready for substantive work.

**Use `/catch-up` instead** if you've been away long enough that you need a deep read (decisions, contracts, full `_index.md`). `/resume` is the light-touch default; `/catch-up` is the cold-start.

### Hard rules — read before doing anything

- **Never write a response to a `[ak]` (ack) entry.** Acks are terminal. Acking an ack is a protocol violation that creates an ack-of-ack loop with no semantic gain. Observe the ack, let your cursor advance past it in step 9 — that's it. This applies even when the ack arrives as the first thing in your inbox after `/join`.
- **Never write into another repo's `repos/<them>/`.** If you need to change `<them>`'s state, write a `log/` entry with `to: [<them>]`.
- **Never write into `overview/`.** It is deprecated; MISSION.md + amendments is the single source of feature identity. The folder may exist for legacy reasons but agents do not write new files there.

**Once-per-session (skip if already loaded this session):** `framework/README.md`, `AGENTS.md` → identify yourself from CWD.

**Format-protocol skip rule:** Open `.claude/settings.local.json` and check `shared_context_framework_version`. If it equals **2** (the current version, declared at README §7's `FRAMEWORK_VERSION`), the format note below is a complete substitute and **you can skip re-reading §7 entirely.** If it's missing or lower, read §7 in full, then update `shared_context_framework_version` to 2 in the settings file. If it's higher than 2, your slash command is out of date — flag this to the user.

**Format note (≈ README §7, v2):** Logs are per-event DSL files in `log/` (`<iso>-<repo>-<slug>.dsl`, one DSL line per file: `from > to [kind] @at: summary | refs | body`). Repo statuses are `<iso>.positional`. Contracts are `<iso>-<repo>-v<X.Y.Z>.dsl`. Legacy `log/*.md` + YAML files still parse — read both shapes.

### 1. Load state (light)

Read in order:

1. `features/$ARGUMENTS/MISSION.md` — feature identity.
2. Latest file in `features/$ARGUMENTS/orchestrator/` (lexically last) — **your checkpoint**. Treat every log/decision/digest older than its `at:` as already absorbed. Fall back to latest `features/$ARGUMENTS/digest/` if no snapshot exists.
3. `features/$ARGUMENTS/cursors/<your-repo>/current.md` — your read cursor (`last_log_read`, `last_pivot_read`, etc). Legacy fallback: latest timestamped file in that folder. No cursor: treat everything newer than the checkpoint's `at:` as new.
4. `features/$ARGUMENTS/repos/<your-repo>/` latest file (newest `.positional`, falling back to legacy `.md`) — your task brief.

**Skip** files with `status: superseded` or a sibling `*.superseded.md` tombstone (use `/audit` for full history). DSL entries retired by a later `[pv]`'s `supersedes:` are out of scope.

### 2. Apply pivots first

Scan `features/$ARGUMENTS/log/*.dsl` (+ legacy `log/*.md`) for entries newer than your checkpoint with kind `[pv]` (pivot). **Apply each pivot before anything else** — they may retire inbox items, your task brief, or active contracts.

If a pivot affects your repo's work, your follow-up is `[ch]` (what you're abandoning vs continuing) plus a fresh `repos/<self>/<iso>.positional` if state shifted. Ack alone is wrong for pivots.

### 3. Watch for in-session pivot triggers

Before pulling inbox: scan the **current conversation** for signals that *this session* is itself a pivot (scope materially shifted, a contract you signed is no longer right, a core assumption broke). If so, surface that and propose `/pivot $ARGUMENTS <reason>` **now**, before writing anything else. Don't proceed past this step until the pivot question is resolved.

### 4. Pull inbox

Read `features/$ARGUMENTS/log/*.dsl` (+ legacy `log/*.md`). An entry is in your inbox where **all** hold:

- `@at:` (DSL) or `at:` (legacy) newer than `cursor.last_log_read` (or checkpoint `at:` if no cursor).
- `to` includes your repo OR is `all`.
- Not retired by a later `[pv]`'s `supersedes: all-prior` or explicit list.

### 5. Auto-ack `[fy]`; drop `[ak]` silently

For each inbox entry with kind `[fy]` (fyi), write a single auto-ack **without asking the user** — `[fy]` is absorptive by design.

For each, write one file at `features/$ARGUMENTS/log/<UTC-ISO-timestamp>-<your-repo>-ack-<short-slug>.dsl`:

```
<your-repo> > <inbound-from> [ak] @<iso>: Acknowledged: <2-5 word recap>. | refs: <inbound-event-filename-or-@at> | <empty, or 1-sentence note about any follow-up>
```

For each inbox entry with kind `[ak]` (an ack of one of your prior events): **don't write anything.** An ack is terminal — confirming an ack creates an ack-of-ack loop with no semantic gain. Observe it, let the cursor advance past it in step 9.

Report the count of auto-acks written + acks observed in your wrap-up.

### 6. Report the substantive inbox (don't write yet)

For every remaining entry (kinds `[q]`, `[bl]`, `[cc]`, `[ch]`, `[tk]`), render a compact table. Block-worthy kinds (`q`-as-ask, `bl`, `cc`) sort to top; conversational (`q`-as-question, `tk`, `ch`) to bottom.

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

**1–4 substantive items:** call `AskUserQuestion` once with one question per row. Header: kind + sender (e.g. `"ask from subs-gateway"`). Options (≤ 4, recommended first per kind):

- **Answer** — substantive `[a]` line. *Recommended for* `q`-ask / `bl`.
- **Change** — make the code change first, then write `[ch]` (or `[cc]` if publishing a new contract version) referencing the inbound. *Recommended when* a `ch` / `cc` affects your code.
- **Ack** — short `[ak]` line; body says what you're doing about it (if anything). *Recommended for* `ch` / `tk` you're aware of but not touching this turn.
- **Skip** — defer; nothing written this turn. *Use for* non-blocking `q`-question when heads-down.

**≥ 5 items:** skip `AskUserQuestion` (caps at 4). One-line proposal per row, then a single "go ahead?" prompt.

**Wait for answers before writing.** "Other → redirect to X" overrides — honour it.

### 8. Write substantive responses

One file per response at `features/$ARGUMENTS/log/<UTC-ISO-timestamp>-<your-repo>-<short-slug>.dsl`:

- **Answer** → `[a]`. `<self> > <inbound-from> [a] @<iso>: <one-sentence summary> | refs: <inbound-event-filename-or-@at> | <body 50–200 words>`.
- **Change** → make the code change first, then `[ch]`. New contract version → `[cc]` + write `contracts/<api>/<iso>-<self>-v<version>.dsl`.
- **Ack** (substantive) → `[ak]` with 1–3 sentences flagging follow-ups.
- **Skip** → don't write; step 9 still advances the cursor past the entry.

**Pivot-aftermath items** (`[pv]` lines from step 2): the right follow-up is `[ch]` (what you're abandoning vs continuing), **not** `[ak]`. If the user picked Ack for a pivot row in step 7, flag it.

### 9. Update cursor

Overwrite `cursors/<self>/current.md`:

- `at:` — now (ISO with colons).
- `last_log_read` — latest log entry processed (filename or `@at:` ISO — whichever sorts correctly against future entries).
- `last_pivot_read` — latest `[pv]` acknowledged (filename or `@at:` ISO), or `null`.
- `last_checkpoint_read` — orchestrator snapshot filename from step 1.
- `contracts_synced` — per-API version file you're synced against.
- `last_decision_read` — latest decision file read.

Body: one short line.

### 10. Wrap up

One sentence: auto-acks written (count), substantive responses written (count + slug list), whether your `repos/<self>/` status needs refreshing, whether you should `/handoff` now or keep working.

**Budget:** ≤ 5k tokens. If your inbox is bigger than that or your state-load is stale, `/catch-up` is the better fit.
