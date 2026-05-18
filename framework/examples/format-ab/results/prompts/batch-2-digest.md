You will receive 3 shared-context digest artefacts in 3 on-disk formats (md+YAML, denser-md, TOML). Extract canonical fields as a JSON array of 3 objects in order. Return ONLY the JSON array.

Expected fields: type, author, at, summary, per_repo (map of repo to state), contracts_active[], decisions_live[], open_cross_repo[], shipped_since_bootstrap[] (objects with at least repo + what), where_to_look (map or absent).

--- Artefact 1 (md+YAML)
```
---
type: digest
author: api
at: 2026-01-10T10:30:00Z
summary: v1 welcome-email pipeline shipped end-to-end on staging; both repos green, no open cross-repo questions.
---

## Feature

`welcome-emails` v1: API enqueues on signup, worker sends via SES, fire-and-forget.

## Per-repo

- **api** — `POST /signup` enqueuing against `welcome-email-job v1.0.0`. Tests green; staging verified. Not blocked.
- **worker** — consumer wired, payload validation in place, non-`en` locales fall through. Staging end-to-end green. Not blocked.

## Active contracts

- `welcome-email-job` → `contracts/welcome-email-job/2026-01-10T09-00-00-api-v1.0.0.md`

## Live decisions

- `decisions/2026-01-10T09-00-00-fire-and-forget-semantics.md` (accepted)

## Open cross-repo questions

- None — worker ack resolved the only open ask.

## What shipped since bootstrap

- API: `POST /signup` enqueue path (`log/2026-01-10T09-30-00-api-shipped.md`).
- Worker: consumer + SES send + staging verification (`log/2026-01-10T10-15-00-worker-ack.md`).

## Where to look for what

- Wire format → `contracts/welcome-email-job/...v1.0.0.md`
- Why fire-and-forget → `decisions/2026-01-10T09-00-00-fire-and-forget-semantics.md`
- Per-repo state → `repos/api/...`, `repos/worker/...`
```

--- Artefact 2 (denser-md)
```
---
type: digest
author: api
at: 2026-01-10T10:30:00Z
summary: v1 welcome-email pipeline shipped end-to-end on staging; both repos green, no open cross-repo questions.
feature: welcome-emails v1
per_repo:
  api: shipped; tests green; staging verified; not blocked
  worker: consumer wired; payload validated; non-`en` falls through; staging green; not blocked
contracts_active: [contracts/welcome-email-job/2026-01-10T09-00-00-api-v1.0.0.md]
decisions_live: [decisions/2026-01-10T09-00-00-fire-and-forget-semantics.md]
open_cross_repo: []
shipped_since_bootstrap:
  - {repo: api, what: "POST /signup enqueue path", ref: log/2026-01-10T09-30-00-api-shipped.md}
  - {repo: worker, what: "consumer + SES send + staging verification", ref: log/2026-01-10T10-15-00-worker-ack.md}
where_to_look:
  wire_format: contracts/welcome-email-job/...v1.0.0.md
  why_fire_and_forget: decisions/2026-01-10T09-00-00-fire-and-forget-semantics.md
  per_repo_state: repos/api/..., repos/worker/...
---
```

--- Artefact 3 (TOML)
```
type = "digest"
author = "api"
at = "2026-01-10T10:30:00Z"
summary = "v1 welcome-email pipeline shipped end-to-end on staging; both repos green, no open cross-repo questions."
feature = "welcome-emails v1"
contracts_active = ["contracts/welcome-email-job/2026-01-10T09-00-00-api-v1.0.0.md"]
decisions_live = ["decisions/2026-01-10T09-00-00-fire-and-forget-semantics.md"]
open_cross_repo = []

[per_repo.api]
state = "shipped"
notes = "POST /signup enqueuing against welcome-email-job v1.0.0; tests green; staging verified."
blocked = false

[per_repo.worker]
state = "shipped"
notes = "consumer wired; payload validation; non-`en` locales fall through; staging end-to-end green."
blocked = false

[[shipped_since_bootstrap]]
repo = "api"
what = "POST /signup enqueue path"
ref = "log/2026-01-10T09-30-00-api-shipped.md"

[[shipped_since_bootstrap]]
repo = "worker"
what = "consumer + SES send + staging verification"
ref = "log/2026-01-10T10-15-00-worker-ack.md"

[where_to_look]
wire_format = "contracts/welcome-email-job/...v1.0.0.md"
why_fire_and_forget = "decisions/2026-01-10T09-00-00-fire-and-forget-semantics.md"
per_repo_state = "repos/api/..., repos/worker/..."
```

