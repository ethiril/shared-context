# shared-context

A **Mission Control** for multi-repo collaboration between Claude Code agents. Each agent works in its own repo and coordinates with the others by appending timestamped files into per-feature folders here. You — the human — read the auto-generated `dashboard.html` to stay aligned without parsing logs.

> **You are an agent reading this?** Stop. This file is for humans setting up the system. Go to [`framework/README.md`](./framework/README.md) — that's the protocol you act on.

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

The **framework** is shareable across teams. The repo root holds **your team's** roster, features, and dashboard.

---

## Setup

Two scripts cover the four required pieces. Run step 1 once per machine (slash commands are user-global). Run step 2 once per participating repo.

> **TL;DR** — once you've cloned the shared-context repo somewhere on disk:
>
> ```bash
> ./framework/bin/setup-claude.sh                                                       # step 1 (interactive)
> ./framework/bin/wire-repo.sh /path/to/your-repo your-identity "Your one-line role"    # step 2
> ```
>
> Step 1 symlinks the slash commands. Step 2 patches the repo's `.claude/settings.local.json` (permissions + hooks + framework version marker), appends a pointer to its `CLAUDE.md`, and adds its row to the shared-context `AGENTS.md`. Both scripts are idempotent.
>
> If you prefer to do it by hand, the four sub-steps are spelled out below.

### 1. Symlink the slash commands into your Claude config

Slash commands (`/resume`, `/refresh`, `/handoff`, etc.) need to live in `~/.claude/commands/` so Claude Code picks them up in every CWD.

The bundled script drops you into an interactive menu — nothing on disk changes until you choose `apply` or `force`:

```bash
./framework/bin/setup-claude.sh
```

First-run flow: type `s` (status) to see per-file state, `p` (plan) for target paths and notes, then `a` (apply) to create the symlinks. If pre-existing copies differ from source, `f` (force) replaces them and writes a `.bak` for each first. Other shortcuts: `d` (diff), `r` (refresh), `h` (help), `q` (quit).

It only touches files whose names match `framework/commands/*.md`; any other files already in `~/.claude/commands/` are left alone.

Optional env overrides: `CLAUDE_COMMANDS_DIR` (default `~/.claude/commands`), `SHARED_CONTEXT_ROOT` (default: auto-detected from the script's location), `NO_COLOR=1` to disable colors.

Or wire them by hand:

```bash
export SHARED_CONTEXT_ROOT="/absolute/path/to/your/shared-context"
mkdir -p ~/.claude/commands
ln -sf "$SHARED_CONTEXT_ROOT"/framework/commands/*.md ~/.claude/commands/
```

Restart any open Claude Code sessions afterwards.

### 2. Wire the hooks into every participating repo

The one-shot route is:

```bash
./framework/bin/wire-repo.sh /absolute/path/to/repo <identity> "<one-line role>"
```

That does steps 2, 3 and 4 below in one pass. Idempotent — re-running is safe.

If you'd rather do it by hand, each repo whose agent will write into `shared-context/features/` needs two hooks in its `.claude/settings.local.json`. Paste this block as a sibling of the existing `permissions` block, substituting the absolute path:

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

What each hook does:

- `hook-lint.sh` (PreToolUse / Write) — keeps new files under `features/<slug>/` inside per-artifact word budgets. Warns on stderr by default; set `SHARED_CONTEXT_LINT_MODE=block` to make violations block the write.
- `hook-render.sh` (PostToolUse / Write+Edit) — regenerates `dashboard.html` from raw state. Pure aggregation, no LLM cost.

> **Optional third hook.** Add `framework/bin/hook-orchestrate.sh` under PostToolUse to make the orchestrator auto-snapshot on every digest write. Off by default — you control synthesis via `/refresh` instead.

### 3. Point each repo's `CLAUDE.md` at this folder

In each participating repo's `CLAUDE.md`, add one line:

> Cross-repo coordination lives at `/absolute/path/to/your/shared-context`. For any multi-repo feature, read its `framework/README.md` and root `AGENTS.md` before starting.

That's all the repo needs — the shared-context folder carries the rest.

### 4. Add the repo to `AGENTS.md`

Open [`AGENTS.md`](./AGENTS.md), append a row with the repo's identity (lowercase kebab), its absolute CWD, and a one-line role description. Until a repo is listed there, its agent has no identity in the system and can't write valid filenames.

---

## Daily loop (mental model)

Features have three phases: **set up once**, **work recurring**, **wrap up once**. The slash commands map onto those phases.

### Set up (once each)

1. **Bootstrap** — the founding repo. `/bootstrap <slug>` scaffolds `features/<slug>/`, fills `MISSION.md` with you, writes the founding repo's first positional status, drops a `[fy]` announcement log entry so other repos can discover the feature, and writes a minimal first orchestrator snapshot so the dashboard reflects the new feature immediately.
2. **Join** — every *other* participating repo, once. In each, open Claude Code and run `/join <slug>`. Writes that repo's first positional status + a `[fy]` announcement ("owns X, ask me about Y"). Hard-refuses if the repo already has a status row — running it twice is safe, it'll redirect you to `/resume`.

> Both `/bootstrap` and `/join` start with a **one-time-per-repo permissions step**: they'll auto-add blanket `Read(<shared-context>/**)` + `Write(<shared-context>/features/**)` to that repo's `.claude/settings.local.json` so subsequent reads/writes don't trigger per-file approval prompts. Idempotent; if the patterns are already there (or broader), it skips.

### Work (every session, in any repo)

3. **Resume.** First message of a session — or any time you want to clear your inbox: `/resume <slug>`. The agent loads cursor + latest snapshot, applies any pivots since you last looked, **auto-acks `[fy]`/`[ak]` inbox items**, and surfaces substantive items (asks, blockers, contract changes) for your decision.
4. **Work happens.** Agents append `log/<iso>-<repo>-<slug>.dsl` entries for cross-repo events, refresh `repos/<self>/<iso>.positional` when status changes, write `contracts/<api>/<iso>-<repo>-v<X.Y.Z>.dsl` for API changes, and `decisions/` for non-obvious choices. Hooks keep `dashboard.html` current automatically. Anything that goes into a repo's positional `blocked_on` field surfaces on the dashboard's "Needs your attention" pane immediately — no `/refresh` needed.
5. **Handoff.** Before `/clear` or session end: `/handoff <slug>`. Conditionally writes a digest, always overwrites the cursor so the next `/resume` is cheap.

### Situational

- **Cold start after a long break** → `/catch-up <slug>` instead of `/resume`. Same shape but reads deeper (decisions, contracts, `_index.md`).
- **Direction changes** → `/pivot <slug> <reason>`. Writes a `[pv]` log entry, asks you which prior decisions/contracts to tombstone, and stubs placeholder ADRs for unresolved replacements. **Agents will also propose `/pivot` proactively** when a session reveals a pivot trigger.
- **Want a synthesised view** → `/refresh <slug>`. Rebuilds the orchestrator snapshot + `dashboard.html` + `_index.md`. The agent may ask 1–2 tight yes/no questions inline.
- **Verify history** → `/audit <slug>`. Reads everything including superseded entries and pivot-retired log lines. Use sparingly.

### Wrap up (once)

6. **Close.** `/close-project <slug> [done|paused] <reason>`. Flips `MISSION.md` status, writes a closing digest. The dashboard moves the feature to the Archived tab.

All nine slash commands are documented in [`framework/README.md`](./framework/README.md#slash-commands).

---

## Reading the dashboard

```bash
open dashboard.html
```

Items needing your attention pin to the top. They come from two sources:
- **Orchestrator snapshot's "Open for the human"** — rich prose, refreshed when you run `/refresh <slug>`.
- **Per-repo positional `blocked_on`** — terse, surfaces as soon as a repo writes a new positional row with a non-empty blocker. No `/refresh` needed.

Per-feature pages live alongside; the latest orchestrator snapshot under each feature is what you skim if you've been away.

---

## Working tips

- **Name the feature explicitly at every session start.** Don't let the agent guess. `/resume <slug>`, not just "resume."
- **`/join` is once per repo per feature.** After that, `/resume` is the verb. Running `/join` twice is safe — it hard-refuses and tells you to `/resume` instead.
- **Ask for a digest at milestones**, not only at session end. Mid-session digests pay back 10× on the next resume.
- **Use `/clear` between features, not within.** Within a feature, the cursor + digest carry continuity.
- **Pivot when direction shifts.** Either you trigger `/pivot <slug> <reason>`, or the agent proposes it after spotting a trigger in the session. Both write the same protocol entry.
- **Use `blocked_on` to make waits visible.** When a repo finishes its part but the rest isn't done, write a new positional with `current_goal: idle — waiting on <X>` + a `blocked_on` entry naming the blocker. The dashboard pins it on "Needs your attention" automatically. See `framework/CONVENTIONS.md` → "Signalling I'm done with my part."
- **Confirm the checkpoint after `/clear` + `/resume`.** Follow up with: *"Tell me which snapshot you read and which contract versions you're synced against."* Catches stale-state bugs in 5 seconds.
- **One agent per repo at a time.** Cross-repo parallelism is the point; multiple agents inside the same repo race on `repos/<self>/`.
- **Don't hand-edit anything under `features/<slug>/`.** Append-only is structurally enforced for agents but not for humans — breaking it desyncs everyone.

---

## Where to dig deeper

- [`framework/README.md`](./framework/README.md) — agent protocol. (Agents read this; you probably don't need to.)
- [`framework/CONVENTIONS.md`](./framework/CONVENTIONS.md) — Mission Control conventions (snapshot format, writing-for-agents rules).
- [`framework/orchestrator/brief.md`](./framework/orchestrator/brief.md) — orchestrator role definition. (For when you're curious how `/refresh` works under the hood.)
- [`framework/examples/`](./framework/examples/) — worked example feature.
