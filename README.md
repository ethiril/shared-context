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

Nine of them. Features have three phases — set up once, work recurring, wrap up — and the commands map onto those phases.

### Set up

- `/bootstrap <slug>` — founding repo only. Scaffolds `features/<slug>/`, writes the first positional status, drops a `[fy]` announcement so other repos can discover the feature, and writes a starter orchestrator snapshot so the dashboard reflects it immediately.
- `/join <slug>` — every *other* participating repo, once. Writes that repo's first positional + `[fy]` announcement ("owns X, ask me about Y"). Hard-refuses if the repo already has a row — running twice is safe, it'll redirect you to `/resume`.

> Both kick off with a one-time-per-repo permissions step: blanket `Read(<shared-context>/**)` + `Write(<shared-context>/features/**)` get auto-added to that repo's `.claude/settings.local.json` so subsequent reads/writes don't trigger per-file prompts. Idempotent.

### Work (every session, any repo)

- `/resume <slug>` — first message of a session, or anytime you want to clear the inbox. Loads cursor + latest snapshot, applies pivots since you last looked, auto-acks `[fy]`/`[ak]` items, surfaces substantive items (asks, blockers, contract changes) for your decision.
- `/handoff <slug>` — before `/clear` or session end. Conditionally writes a digest, always overwrites the cursor so the next `/resume` is cheap.
- `/pivot <slug> <reason>` — direction changed. Writes a `[pv]` log entry, asks which prior decisions/contracts to tombstone, stubs placeholder ADRs for unresolved replacements. Agents will also propose `/pivot` proactively when a session reveals a trigger.
- `/refresh <slug>` — rebuild orchestrator snapshot + `dashboard.html` + `_index.md`. Synthesised view; the agent may ask 1–2 tight yes/no questions inline.

### Situational

- `/catch-up <slug>` — cold start after a long break. Same shape as `/resume` but reads deeper (decisions, contracts, `_index.md`).
- `/audit <slug>` — full history walk, including superseded entries and pivot-retired log lines. Use sparingly.

### Wrap up

- `/close-project <slug> [done|paused] <reason>` — flips `MISSION.md` status, writes a closing digest. Dashboard moves the feature to the Archived tab.

Agent-side spec for each command lives in [`framework/README.md#slash-commands`](./framework/README.md#slash-commands).

In between commands, agents append `log/<iso>-<repo>-<slug>.dsl` entries for cross-repo events, refresh `repos/<self>/<iso>.positional` when status changes, write `contracts/<api>/<iso>-<repo>-v<X.Y.Z>.dsl` for API changes, and `decisions/` for non-obvious choices. Hooks keep `dashboard.html` current automatically.

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
- **Ask for a digest at milestones**, not only at session end. Mid-session digests pay back 10× on the next resume.
- **`/clear` between features, not within.** Within a feature, the cursor + digest carry continuity.
- **Pivot when direction shifts.** Either you trigger `/pivot <slug> <reason>`, or the agent proposes it after spotting a trigger. Same protocol entry either way.
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
