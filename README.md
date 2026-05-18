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

## Setup — do all four, in order

If any of these are missing the system doesn't work. Slash commands won't appear, hooks won't fire, agents won't find their identity, the dashboard won't render.

### 1. Symlink the slash commands into your Claude config

Slash commands (`/resume`, `/refresh`, `/handoff`, etc.) need to live in `~/.claude/commands/` so Claude Code picks them up in every CWD.

```bash
export SHARED_CONTEXT_ROOT="/absolute/path/to/your/shared-context"
mkdir -p ~/.claude/commands
ln -sf "$SHARED_CONTEXT_ROOT"/framework/commands/*.md ~/.claude/commands/
```

Restart any open Claude Code sessions afterwards.

### 2. Wire the hooks into every participating repo

Each repo whose agent will write into `shared-context/features/` needs two hooks in its `.claude/settings.local.json`. Paste this block as a sibling of the existing `permissions` block, substituting the absolute path:

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

1. **Bootstrap a feature once.** `/bootstrap <slug>` in any agent session. Scaffolds the folder + fills in `MISSION.md`.
2. **Open Claude Code in each participating repo.** First message: *"You're on feature `<slug>`. Quick resume."* — the agent reads `framework/README.md`, finds its identity in `AGENTS.md`, and runs the resume protocol.
3. **Let agents work.** They append `log/`, `contracts/`, `decisions/`, `repos/<self>/`, `digest/` entries. Hooks keep `dashboard.html` current automatically.
4. **Run `/refresh <slug>` when you want a synthesised view.** Rewrites the human-facing orchestrator snapshot + dashboard. The agent may ask 1–2 tight yes/no questions (MISSION amendments, tombstones) before writing.
5. **Before `/clear`**, say *"Handoff."* — drops a digest + cursor so the next session resumes cleanly.

All nine slash commands are documented in [`framework/README.md`](./framework/README.md#slash-commands).

---

## Reading the dashboard

```bash
open dashboard.html
```

Items needing your attention pin to the top. Per-feature pages live alongside; the latest orchestrator snapshot under each feature is what you skim if you've been away.

---

## Working tips

- **Name the feature explicitly at every session start.** Don't let the agent guess.
- **Ask for a digest at milestones**, not only at session end. Mid-session digests pay back 10× on the next resume.
- **Use `/clear` between features, not within.** Within a feature, digests carry continuity.
- **Say "pivot" when direction changes.** That keyword routes the agent into the right protocol (writes a `kind: pivot` log + tombstones).
- **Confirm the checkpoint after `/clear`.** First message: *"Tell me which digest you read and which contract versions you're synced against."* Catches stale-state bugs in 5 seconds.
- **One agent per repo at a time.** Cross-repo parallelism is the point; multiple agents inside the same repo race on `repos/<self>/`.
- **Don't hand-edit anything under `features/<slug>/`.** Append-only is structurally enforced for agents but not for humans — breaking it desyncs everyone.

---

## Sharing the framework with another team

Copy the `framework/` folder into a fresh repo, fill in `AGENTS.md` from [`framework/AGENTS.template.md`](./framework/AGENTS.template.md), then run setup steps 1–4 above for the new team's repos. Paths auto-discover from the repo root.

See [`framework/examples/sample-feature/`](./framework/examples/sample-feature/) for a complete worked feature.

---

## Where to dig deeper

- [`framework/README.md`](./framework/README.md) — agent protocol. (Agents read this; you probably don't need to.)
- [`framework/CONVENTIONS.md`](./framework/CONVENTIONS.md) — Mission Control conventions (snapshot format, writing-for-agents rules).
- [`framework/orchestrator/brief.md`](./framework/orchestrator/brief.md) — orchestrator role definition. (For when you're curious how `/refresh` works under the hood.)
- [`framework/examples/`](./framework/examples/) — worked example feature.
