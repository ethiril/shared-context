# Examples

Worked examples of complete `features/<slug>/` folders. Read end-to-end to see what a finished feature looks like before bootstrapping your own.

## `sample-feature/` — `welcome-emails`

Small fictitious two-repo feature: `api` enqueues a job on signup; `worker` consumes the queue and sends an email via SES. v1 ships fire-and-forget — no retry, no callback.

Shows:

- `MISSION.md` — Goal / Scope / Repos / Success criteria for a real-sized feature.
- `contracts/welcome-email-job/...v1.0.0.dsl` — versioned wire contract as a single DSL line (producer / consumer / queue / payload sections, `|`-separated).
- `decisions/...-fire-and-forget-semantics.md` — ADR (YAML frontmatter + body) with rationale + tradeoffs.
- `log/` contract-change + answer pair — `api > worker [cc]` then `worker > api [a]`. One DSL line per file; note the `from > to [kind] @at: summary | refs | body` shape.
- `repos/<repo>/<ts>.positional` — one positional record per status snapshot. 9 fields, `|`-separated; `~`-separated lists for `done`/`next`/`blocked_on`; inline JSON for `contracts_in_play` and `open_questions`.
- `digest/` — end-of-session checkpoint (YAML + body) that stands alone as state of the feature.
- `orchestrator/<ts>-orchestrator.md` — human-facing snapshot. Note the prose voice and `Open for the human` section.
- `cursors/<repo>/current.md` — per-repo rolling "what I've read" bookmark (overwritten each session).

This sample is **inert** — `framework/examples/` lives outside the top-level `features/` directory the renderer scans, so the dashboard ignores it. Copy the structure, not the literal files.
