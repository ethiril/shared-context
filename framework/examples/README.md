# Examples

Worked examples of complete `features/<slug>/` folders. Read end-to-end to see what a finished feature looks like before bootstrapping your own.

## `sample-feature/` — `welcome-emails`

Small fictitious two-repo feature: `api` enqueues a job on signup; `worker` consumes the queue and sends an email via SES. v1 ships fire-and-forget — no retry, no callback.

Shows:

- `MISSION.md` — Goal / Scope / Repos / Success criteria for a real-sized feature.
- `overview/` — agent-authored first description of the same.
- `contracts/welcome-email-job/v1.0.0.md` — versioned wire contract with producer/consumer expectations.
- `decisions/...-fire-and-forget-semantics.md` — ADR with rationale + tradeoffs.
- `log/` ask + answer pair — `api` ships a contract-change, `worker` acks. Note the `to:` routing.
- `repos/<repo>/<ts>.md` — terse, bulleted per-repo statuses.
- `digest/` — end-of-session checkpoint that stands alone as state of the feature.
- `orchestrator/<ts>-orchestrator.md` — human-facing snapshot. Note the prose voice and `Open for the human` section.
- `cursors/<repo>/<ts>.md` — per-repo "what I've read" bookmark.

This sample is **inert** — `framework/examples/` lives outside the top-level `features/` directory the renderer scans, so the dashboard ignores it. Copy the structure, not the literal files.
