# Examples

Worked examples of complete shared-context feature folders. Read these end-to-end to see what a finished feature looks like before bootstrapping your own.

## `sample-feature/` — `welcome-emails`

A small fictitious two-repo feature: an `api` enqueues a job on signup; a `worker` consumes the queue and sends an email via SES. v1 ships fire-and-forget — no retry, no callback.

Worth reading because it shows:

- **`MISSION.md`** — Goal / Scope / Repos / Success criteria filled in for a real-sized feature.
- **`overview/`** — the agent-authored first description of the same.
- **`contracts/welcome-email-job/v1.0.0.md`** — a versioned wire contract with producer/consumer expectations.
- **`decisions/...-fire-and-forget-semantics.md`** — an ADR documenting why we chose the trade-off.
- **`log/` ask + answer pair** — `api` ships a contract-change, `worker` acks. Note the `to:` field routing the message.
- **`repos/<repo>/<ts>.md`** — per-repo status snapshots, terse and bulleted.
- **`digest/`** — an end-of-session checkpoint that stands alone as "state of the feature today."
- **`orchestrator/<ts>-orchestrator.md`** — the human-facing snapshot. Note the prose voice and "Open for the human" section.
- **`cursors/<repo>/<ts>.md`** — each repo's "what I've read" bookmark.

This sample feature is **inert** — it is not picked up by the dashboard render because `framework/examples/` lives outside the top-level `features/` directory the renderer scans. Copy the structure, not the literal files, when bootstrapping your own feature.
