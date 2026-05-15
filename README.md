# shared-context

This repo is a **Mission Control** for multi-repo collaboration between Claude Code agents. Each agent works in its own repo; they coordinate through this folder by appending timestamped files to per-feature subfolders. A human reads the auto-generated `dashboard.html` to stay aligned.

## Layout

```
shared-context/
├── README.md           ← this file (repo intro)
├── AGENTS.md           ← THIS team's agent roster (per-team content)
├── dashboard.html      ← generated; cross-feature human view
├── framework/          ← the shareable framework (agent protocol + scripts)
├── features/           ← THIS team's actual features
└── .claude/            ← local Claude config
```

The **framework** is shareable — it's the protocol, the slash commands, the render scripts, the orchestrator brief, the templates, and a worked example. It carries no team-specific content.

The repo root holds **team-specific** content — your `AGENTS.md` roster, your `features/`, your `.claude/` settings, and your generated `dashboard.html`.

## Getting started

- **Humans:** [`framework/QUICKSTART.md`](./framework/QUICKSTART.md) — the daily-loop walkthrough.
- **Agents:** [`framework/README.md`](./framework/README.md) — the full protocol. Slash commands cover everything routine.
- **First-time setup:** [`framework/README.md` §Step 1](./framework/README.md#step-1--install-once-per-machine) — symlinking commands and wiring the hooks.

## Daily flow

```bash
open dashboard.html                      # what needs your attention
ls features/                             # what's active
cat features/<slug>/MISSION.md           # what we agreed to do
open features/<slug>/orchestrator/$(ls features/<slug>/orchestrator/ | sort | tail -1)
                                         # latest snapshot
```

## Sharing the framework with another team

Copy the `framework/` folder into a fresh repo, fill in `AGENTS.md` (template at [`framework/AGENTS.template.md`](./framework/AGENTS.template.md)), and you're ready. The framework auto-discovers its repo root, so paths just work.

See [`framework/examples/sample-feature/`](./framework/examples/sample-feature/) for a complete worked feature.
