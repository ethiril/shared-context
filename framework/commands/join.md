---
description: Join an existing shared-context feature as a new repo
argument-hint: <feature-slug>
model: claude-opus-4-7
---

Join feature **$ARGUMENTS** — announce your repo's presence and write your first status.

`/join` is for a repo that **didn't bootstrap** the feature but is now participating. Run it **once per repo per feature.** After that, use `/resume` to continue work.

**Once-per-session (skip if already loaded):** `framework/README.md` (especially §7 — artefact formats), `AGENTS.md` → identify yourself from CWD.

### 0. Ensure shared-context permissions + framework version marker (one-time per repo)

Read your repo's `CLAUDE.md` to find the *"Cross-repo coordination lives at …"* line — that absolute path is `<SHARED_CONTEXT_ROOT>`. Open `.claude/settings.local.json` in your CWD. Do both of the below; Edit the file as needed:

**Permissions** — if `permissions.allow` doesn't already include both patterns below, add them (substitute `<SHARED_CONTEXT_ROOT>` with the literal path):

- `Read(<SHARED_CONTEXT_ROOT>/**)` — read anywhere in shared-context
- `Write(<SHARED_CONTEXT_ROOT>/features/**)` — write under `features/` only

**Framework version marker** — set a top-level field: `"shared_context_framework_version": 2`. This tells future `/resume` and `/catch-up` sessions in this repo that you've absorbed README §7 at v2, so they can skip re-reading it. Bump the value when README §7 declares a new `FRAMEWORK_VERSION`.

**Idempotent:** skip if both perm patterns (or broader equivalents like a bare `*`) and the version marker are already present. Don't remove existing narrower entries — additive only. If `.claude/settings.local.json` doesn't exist, create it with the two patterns under `permissions.allow`, an empty `deny: []`, and the version marker at the top level. After this step, shared-context reads/writes auto-approve without per-file prompts.

### 1. Hard-check: not already joined

Look at `features/$ARGUMENTS/repos/<your-repo>/`. **If any file exists there, refuse and stop** — output: `"Already joined; run /resume $ARGUMENTS instead (or /catch-up if you've been away)."` Do **not** write.

If the directory is empty or missing, proceed.

### 2. Light orient

Read enough to know what you're joining:

1. `features/$ARGUMENTS/MISSION.md` — Goal, Scope, Repos involved, Success criteria.
2. Latest file in `features/$ARGUMENTS/orchestrator/` (lexically last) — current synthesised state. Fall back to latest `features/$ARGUMENTS/digest/` if no snapshot exists.

Confirm your repo is named under MISSION's "Repos involved." If not, surface that to the user — they may have meant a different feature, OR MISSION needs amending first. **Stop and ask** before writing.

### 3. First repo status — positional

`features/$ARGUMENTS/repos/<your-repo>/<UTC-ISO-timestamp>.positional` — single line. Schema (9 fields, 8 pipes; see README §7 → repo status, bootstrap.md step 4 for the full reference):

```
repo|at|summary|current_goal|done|next|blocked_on|contracts_in_play|open_questions
```

Bootstrap-state shape (everything empty but `summary` + `current_goal`; `done`/`next`/`blocked_on` are `~`-separated lists — blank = empty; `contracts_in_play` + `open_questions` are inline JSON — `[]` if none):

```
<your-repo>|<iso-with-colons>|Joining feature — <one-sentence current state>|<one-sentence current goal>||||[]|[]
```

Eyeball the pipe count: **8 pipes**, no more.

### 4. Announcement log entry — DSL `[fy]`

Write a single DSL line as one file: `features/$ARGUMENTS/log/<UTC-ISO-timestamp>-<your-repo>-join.dsl`. Grammar (README §7 → log entries):

```
<your-repo> > all [fy] @<iso-with-colons>: Joined feature — owns <area>; ask me about <topic-list> | refs: repos/<your-repo>/<iso>.positional | <body — 15-40 words MAX, optional>
```

- `<area>` — one-line description of your repo's domain (lift from `AGENTS.md` if needed).
- `<topic-list>` — 2-4 short tags other agents could ask you about.
- Body — **only if** there's something other agents need beyond what's in your positional row (e.g. a time window when you're available, a single critical caveat). **Don't recap your AGENTS.md role or your positional `current_goal`** — both are already linked.

### 5. Cursor — fresh

Write `features/$ARGUMENTS/cursors/<your-repo>/current.md` (YAML+body; rolling, overwrite-in-place):

```yaml
---
at: <iso-with-colons>
last_checkpoint_read: <orchestrator-snapshot-or-digest-filename-from-step-2>
last_log_read: <your-own-join-filename-or-@at-iso>
last_pivot_read: null
contracts_synced: []
last_decision_read: null
---
```

Body: one short line — e.g. "joined; nothing pending yet."

### 6. Confirm

One sentence: which paths you wrote (positional, log entry, cursor), and the next concrete step (usually `/resume $ARGUMENTS` to process any inbound asks once other repos see your join announcement).

**Onboarding done.** This is the last time you'll run `/join` for this feature. Subsequent sessions in this repo use `/resume $ARGUMENTS` (or `/catch-up $ARGUMENTS` if you've been away).
