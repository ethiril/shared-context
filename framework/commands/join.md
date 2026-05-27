---
description: Join an existing shared-context feature as a new repo
argument-hint: <feature-slug>
model: claude-opus-4-7
---

Join feature **$ARGUMENTS** — announce your repo's presence and write your first status.

`/join` is for a repo that **didn't bootstrap** the feature but is now participating. Run it **once per repo per feature.** After that, use `/resume` to continue work.

**Once-per-session (skip if already loaded):** `framework/README.md` (especially §7 — artefact formats), `AGENTS.md` → identify yourself from CWD.

### 0. Resolve root + framework version marker (one-time per repo)

**Resolve `<SHARED_CONTEXT_ROOT>`** in this order, stopping at the first hit:

1. Top-level `shared_context_root` in `~/.claude/settings.json` (written by `framework/bin/setup-claude.sh` on `apply`/`force`). This is the normal path.
2. Fallback for fresh clones: your repo's `CLAUDE.md` *"Cross-repo coordination lives at …"* line.

**Permissions live globally now.** The shared-context bundle (`Read`, `Write`, `Edit`, `Bash(node …/render-dashboard.mjs)`, `Bash(date -u *)`) is managed by `setup-claude.sh` in `~/.claude/settings.json` — do **not** add these to per-repo `.claude/settings.local.json`. If you hit permission prompts for any of those during this session, the bundle isn't enrolled on this machine yet; tell the user to run `framework/bin/setup-claude.sh` and choose `apply`.

**Framework version marker** — this is per-repo state. Open `.claude/settings.local.json` in your CWD and set top-level field `"shared_context_framework_version": 3`. Tells future `/resume` and `/catch-up` sessions in this repo that you've absorbed README §7 at v3, so they can skip re-reading it. Bump the value when README §7 declares a new `FRAMEWORK_VERSION`.

Idempotent: skip if the marker is already present. If the file doesn't exist, create it with `{"shared_context_framework_version": 3}`.

### 1. Hard-check: not already joined

Look at `features/$ARGUMENTS/repos/<your-repo>/`. **If any file exists there, refuse and stop** — output: `"Already joined; run /resume $ARGUMENTS instead (or /catch-up if you've been away)."` Do **not** write.

If the directory is empty or missing, proceed.

### 2. Light orient

Read enough to know what you're joining:

1. `features/$ARGUMENTS/MISSION.md` — Goal, Scope, Repos involved, Success criteria. **If frontmatter has `project: <id>`,** also read `globals/<id>/PROJECT.md` (mission, owners) and `globals/<id>/_index.md` (slugs + keywords). That gives you the shared-context surface you're joining. **Never bulk-load** entry files; pull specific entries only when your work touches matching keywords (README §2).
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

### 5. Answer or ack inbound `[q]` entries

Bootstrap (and any later session) may have written `[q]` log entries directed at you. Surface and resolve them now while you're orienting — don't push this to the next `/resume`.

**Scan.** Read every `features/$ARGUMENTS/log/*.dsl` file; pick out lines whose `[kind]` is `q` and whose `to` field is `<your-repo>`, `all`, or a comma-list containing `<your-repo>`. Skip any `[q]` that already has a downstream `[a]` referencing it via `refs:`.

**For each unresolved `[q]`:**

1. **Try to answer from local context** — `AGENTS.md`, repo `CLAUDE.md`, code, docs. If the answer is unambiguous, write one DSL log file:

   ```
   features/$ARGUMENTS/log/<UTC-ISO-timestamp>-<your-repo>-a-<short-slug>.dsl
   ```

   Grammar:

   ```
   <your-repo> > <original-asker> [a] @<iso-with-colons>: <one-line answer> | refs: <original-q-filename> | <body — 15-40 words, optional supporting detail>
   ```

2. **If you can't answer confidently**, do two writes:

   - First an `[ak]` so the asker sees the question landed:

     ```
     <your-repo> > <original-asker> [ak] @<iso>: Seen — gathering an answer from the human. | refs: <original-q-filename> |
     ```

   - Then prompt the human inline (use `AskUserQuestion` with the question as the prompt and 2–3 plausible options derived from your repo's domain, plus the implicit "Other"). On their response, write an `[a]` file using the same grammar as case 1, with `refs:` pointing at the original `[q]` (not the `[ak]`).

**One file per ack/answer.** Don't bundle two questions into one log file. Eyeball each emitted line: it must contain exactly one `|` between `summary` and `refs:`, and one between `refs:` and `body` (body may be empty).

If the scan finds nothing, this step is a no-op — move on.

### 6. Cursor — fresh

Write `features/$ARGUMENTS/cursors/<your-repo>/current.md` (YAML+body; rolling, overwrite-in-place):

```yaml
---
at: <iso-with-colons>
last_checkpoint_read: <orchestrator-snapshot-or-digest-filename-from-step-2>
last_log_read: <newest-log-filename-you-touched-or-your-own-join-filename>
last_pivot_read: null
contracts_synced: []
last_decision_read: null
---
```

Body: one short line — e.g. "joined; nothing pending yet." or "joined; answered N inbound [q]s."

### 7. Confirm

One sentence: which paths you wrote (positional, join announcement, any `[a]`/`[ak]` files, cursor), and the next concrete step (usually `/resume $ARGUMENTS` to process any inbound asks once other repos see your join announcement).

**Onboarding done.** This is the last time you'll run `/join` for this feature. Subsequent sessions in this repo use `/resume $ARGUMENTS` (or `/catch-up $ARGUMENTS` if you've been away).
