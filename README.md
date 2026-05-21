> If you're an agent reading this, stop here. This file is written for humans, and your protocol lives in [`framework/README.md`](./framework/README.md).

# shared-context

Mission Control for multi-repo Claude Code agents. Each agent works in its own repo and gossips with the others by appending timestamped files into per-feature folders here. As the human you open `dashboard.html` to stay aligned without having to parse logs.

---

## Setup

There are two scripts. Step 1 runs once per machine since slash commands are user-global, and step 2 runs once per participating repo.

```bash
./framework/bin/setup-claude.sh                                                       # step 1 (interactive)
./framework/bin/wire-repo.sh /path/to/your-repo your-identity "Your one-line role"    # step 2
```

What they do:

- **Step 1** symlinks `framework/commands/*.md` into `~/.claude/commands/` so Claude Code picks them up in every CWD. It drops you into an interactive menu, and nothing on disk changes until you hit `a` to apply or `f` to force. The other keys are `s` for per-file state, `p` for target paths, and `d` for diffs.
- **Step 2** patches the repo's `.claude/settings.local.json` with permissions, hooks, and a framework version marker, appends a pointer line to its `CLAUDE.md`, and adds its row to [`AGENTS.md`](./AGENTS.md).

Both scripts are idempotent so you can safely re-run them. Restart any open Claude sessions afterwards and that's the whole setup.

If you'd rather do it by hand, the four sub-steps are spelled out further down.

---

## Slash commands

There are eleven commands in total: three for setup, five for daily work, two situational, one cross-feature, and one for wrap-up.

### Set up
- `/bootstrap <slug>` — founding repo. Scaffolds the feature, drops a `[fy]` announcement, writes the first snapshot.
- `/join <slug>` — every other repo, once. Writes the repo's first positional + `[fy]`. Safe to re-run (redirects to `/resume`).

### Work (every session)
- `/resume <slug>` — first message. Clears the inbox; surfaces asks, blockers, contract changes.
- `/handoff <slug>` — before `/clear`. Digest if useful; always writes the cursor.
- `/pivot <slug> <reason>` — direction shifted. Tombstones stale decisions/contracts.
- `/refresh <slug>` — rebuild orchestrator snapshot + `dashboard.html` + `_index.md`.
- `/tighten <slug>` — review + refactor + test the current branch's changes.

### Situational
- `/catch-up <slug>` — cold start after a long break. Deeper read than `/resume`.
- `/audit <slug>` — full history including superseded entries. Use sparingly.

### Cross-feature
- `/global-add <project> <category> <slug>` — add or update a `globals/<project>/` entry shared across features.

### Wrap up
- `/close-project <slug> [done|paused] <reason>` — flips `MISSION.md` status; dashboard moves the feature to Archived.

The first `/bootstrap` or `/join` per repo auto-adds blanket `Read(<shared-context>/**)` + `Write(<shared-context>/features/**)` permissions to that repo's `.claude/settings.local.json`, and it's idempotent so you can safely re-run it. Agent-side specs for each command live in [`framework/README.md#slash-commands`](./framework/README.md#slash-commands).

Between commands, agents append `log/*.dsl`, `repos/<self>/*.positional`, `contracts/<api>/*.dsl`, and `decisions/*.md` files as side-effects of their work. Hooks keep `dashboard.html` up to date automatically.

---

## The optimal cycle

```
                  [ unborn ]
                      │
                      │  /bootstrap + /join×N
                      ▼
       ┌──────────────────────────────┐
       │             IDLE             │ ◄────┐
       │  no active session anywhere  │      │
       └──────────────────────────────┘      │
                      │                      │
                      │  /resume             │  /handoff → /clear
                      ▼                      │
       ┌──────────────────────────────┐      │
       │        ACTIVE SESSION        │      │
       │  work + logs;                │      │
       │  /pivot, /refresh, /tighten  │      │
       │  are in-state actions        │ ─────┘
       └──────────────────────────────┘
                      │
                      │  /close-project [done|paused]
                      ▼
                  [ ARCHIVED ]
```

Bootstrap is only used to kick off a feature. Daily use is the loop of commands, usually you would only use `/resume`, `/handoff`, and occasionally `/pivot` and `/refresh` once you want a fresh dashboard. `/tighten` would only come towards the end of feature development, the other commands are self explanatory.

Per session and per repo, you open with `/resume <slug>` and close with `/handoff <slug>` then `/clear`. If you skip the handoff the next resume gets expensive, since the cursor is what keeps it cheap.

Ask for a digest at milestones, not only at session end. A mid-session digest pays back 10× on the next `/resume`. Run `/refresh` whenever the dashboard feels stale.

When direction shifts, use `/pivot` rather than silently abandoning the prior plan. If the plan changes — say scope shrinks, an API approach turns out wrong, or a decision flips — `/pivot <reason>` writes the tombstones so other repos stop building on retired assumptions.

Cross-repo handshakes follow set shapes. A blocking ask is a `[q]` log with `to: <repo>`, and the answer is an `[a]` log with `refs:`. Long-form scoped work goes in `tickets/<slug>.md` and is referenced from logs. Contract changes always ship as a contract version file plus a `[cc]` log entry, never one without the other.

Wrap up explicitly with `/close-project done|paused <reason>` when the feature ships or stalls. The folder stays for the audit trail and the dashboard archives it.

---

## What's where

```
shared-context/
├── README.md         ← you are here (human onboarding + setup)
├── AGENTS.md         ← repo identity roster (per-team; you edit this)
├── dashboard.html    ← generated; the human view
├── framework/        ← the agent protocol + scripts (don't hand-edit)
├── features/         ← one folder per active feature (agents write here)
└── .claude/          ← local Claude config
```

The **framework** folder is shareable across teams, while the repo root holds **your team's** roster, features, and dashboard.

---

## Reading the dashboard

```bash
open dashboard.html
```

Items needing your attention pin to the top, and there are two sources that feed them.

- The **orchestrator snapshot's "Open for the human"** section — rich prose, refreshed whenever you run `/refresh <slug>`.
- The **per-repo positional `blocked_on`** field — terse, and it surfaces the moment a repo writes a positional with a non-empty blocker, so no `/refresh` is needed.

Per-feature pages live alongside the main view, and the latest orchestrator snapshot under each feature is what you would skim if you've been away for a while.

---

## Setup by hand

If the scripts feel like too much magic, here's exactly what they do under the hood.

### 1. Symlink the slash commands

```bash
export SHARED_CONTEXT_ROOT="/absolute/path/to/your/shared-context"
mkdir -p ~/.claude/commands
ln -sf "$SHARED_CONTEXT_ROOT"/framework/commands/*.md ~/.claude/commands/
```

Only files matching `framework/commands/*.md` get touched, so anything else already in `~/.claude/commands/` is left alone. Restart any open Claude sessions afterwards.

There are two optional environment variables you can set: `CLAUDE_COMMANDS_DIR` overrides the default `~/.claude/commands` target, and `NO_COLOR=1` disables colors.

### 2. Wire the hooks into each repo

There are two hooks to add. Paste the block below as a sibling of the existing `permissions` block in `.claude/settings.local.json`, substituting in the absolute path:

```jsonc
"hooks": {
  "PreToolUse": [
    {
      "matcher": "Write",
      "hooks": [
        { "type": "command", "command": "<SHARED_CONTEXT_ROOT>/framework/bin/hook-lint.sh" }
      ]
    }
  ],
  "PostToolUse": [
    {
      "matcher": "Write|Edit",
      "hooks": [
        { "type": "command", "command": "<SHARED_CONTEXT_ROOT>/framework/bin/hook-render.sh" }
      ]
    }
  ]
}
```

- `hook-lint.sh` keeps new files under `features/<slug>/` inside per-artifact word budgets. It warns on stderr by default, but you can set `SHARED_CONTEXT_LINT_MODE=block` to make violations block the write.
- `hook-render.sh` regenerates `dashboard.html` from raw state. It's pure aggregation with no LLM cost.

There's an optional third hook, `framework/bin/hook-orchestrate.sh` under PostToolUse, which auto-snapshots on every digest write. It's off by default, with `/refresh` as the controlled alternative.

### 3. Point each repo's `CLAUDE.md` at this folder

One line:

> Cross-repo coordination lives at `/absolute/path/to/your/shared-context`. For any multi-repo feature, read its `framework/README.md` and root `AGENTS.md` before starting.

### 4. Add the repo to `AGENTS.md`

Append a row with the repo's identity (lowercase kebab), its absolute CWD, and a one-line role. Until a repo is listed there its agent has no identity in the system and can't write valid filenames.

---

## Working tips

- **Name the feature explicitly at session start.** Use `/resume <slug>` rather than just "resume" so the agent isn't left guessing.
- **`/join` is once per repo per feature.** After that the verb is `/resume`. Running `/join` twice is safe since it hard-refuses with a nudge.
- **`/clear` between features, not within them.** Within a feature the cursor and digest carry continuity for you.
- **Use `blocked_on` to make waits visible.** When a repo finishes its part but the rest isn't done, write a new positional with `current_goal: idle — waiting on <X>` and a `blocked_on` row. The dashboard pins it under "Needs your attention" automatically. See `framework/CONVENTIONS.md` → "Signalling I'm done with my part."
- **Confirm the checkpoint after `/clear` + `/resume`.** Ask the agent *"tell me which snapshot you read and which contract versions you're synced against"* and you'll catch stale-state bugs in 5 seconds.
- **One agent per repo at a time.** Cross-repo parallelism is the point, but multiple agents inside the same repo will race on `repos/<self>/`.
- **Don't hand-edit anything under `features/<slug>/`.** Append-only is structurally enforced for agents but not for humans, and breaking it desyncs everyone.

---

## Where to dig deeper

- [`framework/README.md`](./framework/README.md) — the agent protocol. Agents read this, so you probably don't need to.
- [`framework/CONVENTIONS.md`](./framework/CONVENTIONS.md) — Mission Control conventions, including snapshot format and writing-for-agents rules.
- [`framework/orchestrator/brief.md`](./framework/orchestrator/brief.md) — the orchestrator role definition, for when you're curious how `/refresh` works under the hood.
- [`framework/examples/`](./framework/examples/) — a complete worked example feature.
