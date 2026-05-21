> **Agent reading this? Stop.** This file is for humans. Your protocol is [`framework/README.md`](./framework/README.md) — go there.

# shared-context

Mission Control for multi-repo Claude Code agents. Each agent works in its own repo and gossips with the others by appending timestamped files into per-feature folders here. You — the human — open `dashboard.html` and stay aligned without parsing logs.

---

## Setup

Two scripts. Step 1 once per machine (slash commands are user-global). Step 2 once per participating repo.

```bash
./framework/bin/setup-claude.sh                                                       # step 1 (interactive)
./framework/bin/wire-repo.sh /path/to/your-repo your-identity "Your one-line role"    # step 2
```

What they do:

- **Step 1** symlinks `framework/commands/*.md` into `~/.claude/commands/` so Claude Code picks them up in every CWD. Drops you into an interactive menu — nothing on disk changes until you hit `a` (apply) or `f` (force). `s` shows per-file state, `p` shows target paths, `d` diffs.
- **Step 2** patches the repo's `.claude/settings.local.json` (permissions + hooks + framework version marker), appends a pointer line to its `CLAUDE.md`, and adds its row to [`AGENTS.md`](./AGENTS.md).

Both are idempotent. Restart any open Claude sessions afterwards. That's the whole setup.

If you'd rather do it by hand, the four sub-steps are spelled out further down.

---

## Slash commands

Eleven of them. Three setup, five daily work, two situational, one cross-feature, one wrap-up.

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

First `/bootstrap` or `/join` per repo auto-adds blanket `Read(<shared-context>/**)` + `Write(<shared-context>/features/**)` to that repo's `.claude/settings.local.json`. Idempotent. Agent-side specs: [`framework/README.md#slash-commands`](./framework/README.md#slash-commands).

Between commands, agents append `log/*.dsl`, `repos/<self>/*.positional`, `contracts/<api>/*.dsl`, and `decisions/*.md` as side-effects of work. Hooks keep `dashboard.html` current.

---

## The optimal cycle

```
  once per feature                every session, every repo
  ────────────────                ─────────────────────────
  /bootstrap ──► /join×N ──► /resume ──► work + logs
                                ▲            │
                                │            ├──► /pivot     (direction shift)
                                │            ├──► /refresh   (regen dashboard)
                                │            ▼
                                └── /clear ◄── /handoff
                                                            
                                                  ──► /close-project
                                                      (ships or paused)
```

**Bootstrap is rare; the loop is everything.** Most days you only touch `/resume`, `/handoff`, and occasionally `/pivot` or `/refresh`. The other commands earn their keep on edge days.

**Per session, per repo.** Open with `/resume <slug>`. Close with `/handoff <slug>` then `/clear`. Skipping handoff makes the next resume expensive — the cursor is what keeps it cheap.

**Mid-session, ask for a digest at milestones.** Not only at session end. A mid-session digest pays back 10× on the next `/resume`. Run `/refresh` when the dashboard feels stale.

**Direction shifts use `/pivot` — never silent abandonment.** If the plan changes — scope shrinks, an API approach is wrong, a decision flips — `/pivot <reason>` writes the tombstones so other repos stop building on retired assumptions.

**Cross-repo handshakes have shapes.** Blocking ask = `[q]` log with `to: <repo>`. Answer = `[a]` with `refs:`. Long-form scoped work = `tickets/<slug>.md`, referenced from logs. Contract changes always ship as **contract version file + `[cc]` log entry** — never one without the other.

**Wrap up explicitly.** `/close-project done|paused <reason>` when the feature ships or stalls. The folder stays for the audit trail; dashboard archives it.

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

The **framework** is shareable across teams. The repo root is **your team's** roster, features, and dashboard.

---

## Reading the dashboard

```bash
open dashboard.html
```

Items needing your attention pin to the top. Two sources:

- **Orchestrator snapshot's "Open for the human"** — rich prose, refreshed when you run `/refresh <slug>`.
- **Per-repo positional `blocked_on`** — terse, surfaces the moment a repo writes a positional with a non-empty blocker. No `/refresh` needed.

Per-feature pages live alongside. The latest orchestrator snapshot under each feature is what you skim if you've been away a while.

---

## Setup by hand

If the scripts feel like too much magic, here's exactly what they do.

### 1. Symlink the slash commands

```bash
export SHARED_CONTEXT_ROOT="/absolute/path/to/your/shared-context"
mkdir -p ~/.claude/commands
ln -sf "$SHARED_CONTEXT_ROOT"/framework/commands/*.md ~/.claude/commands/
```

Only files matching `framework/commands/*.md` get touched — anything else already in `~/.claude/commands/` is left alone. Restart any open Claude sessions afterwards.

Optional env overrides: `CLAUDE_COMMANDS_DIR` (default `~/.claude/commands`), `NO_COLOR=1` to disable colors.

### 2. Wire the hooks into each repo

Two hooks. Paste this as a sibling of the existing `permissions` block in `.claude/settings.local.json`, substituting the absolute path:

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

- `hook-lint.sh` keeps new files under `features/<slug>/` inside per-artifact word budgets. Warns on stderr by default; set `SHARED_CONTEXT_LINT_MODE=block` to make violations block the write.
- `hook-render.sh` regenerates `dashboard.html` from raw state. Pure aggregation, no LLM cost.

Optional third hook — `framework/bin/hook-orchestrate.sh` under PostToolUse auto-snapshots on every digest write. Off by default; `/refresh` is the controlled alternative.

### 3. Point each repo's `CLAUDE.md` at this folder

One line:

> Cross-repo coordination lives at `/absolute/path/to/your/shared-context`. For any multi-repo feature, read its `framework/README.md` and root `AGENTS.md` before starting.

### 4. Add the repo to `AGENTS.md`

Append a row: identity (lowercase kebab), absolute CWD, one-line role. Until a repo is listed there, its agent has no identity in the system and can't write valid filenames.

---

## Working tips

- **Name the feature explicitly at session start.** `/resume <slug>`, not "resume." Don't make the agent guess.
- **`/join` is once per repo per feature.** After that the verb is `/resume`. Running `/join` twice is safe — hard-refuses with a nudge.
- **`/clear` between features, not within.** Within a feature, the cursor + digest carry continuity.
- **Use `blocked_on` to make waits visible.** When a repo finishes its part but the rest isn't done, write a new positional with `current_goal: idle — waiting on <X>` and a `blocked_on` row. Dashboard pins it under "Needs your attention" automatically. See `framework/CONVENTIONS.md` → "Signalling I'm done with my part."
- **Confirm the checkpoint after `/clear` + `/resume`.** *"Tell me which snapshot you read and which contract versions you're synced against."* Catches stale-state bugs in 5 seconds.
- **One agent per repo at a time.** Cross-repo parallelism is the point; multiple agents inside the same repo race on `repos/<self>/`.
- **Don't hand-edit anything under `features/<slug>/`.** Append-only is structurally enforced for agents but not for humans — breaking it desyncs everyone.

---

## Where to dig deeper

- [`framework/README.md`](./framework/README.md) — agent protocol. (Agents read this; you probably don't need to.)
- [`framework/CONVENTIONS.md`](./framework/CONVENTIONS.md) — Mission Control conventions (snapshot format, writing-for-agents rules).
- [`framework/orchestrator/brief.md`](./framework/orchestrator/brief.md) — orchestrator role definition. (For when you're curious how `/refresh` works under the hood.)
- [`framework/examples/`](./framework/examples/) — worked example feature.
