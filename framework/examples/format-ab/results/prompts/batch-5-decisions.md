You will receive 3 shared-context decision (ADR) artefacts in 3 on-disk formats (md+YAML, denser-md, TOML). Extract canonical fields as a JSON array of 3 objects in order. Return ONLY the JSON array.

Expected fields: type, title, author, at, summary, status, affects[], rule (string), why[], alternatives_rejected[] (objects with option + reason), consequences[].

For the md+YAML artefact: rule, why, alternatives_rejected, consequences are in the prose body — NOT in frontmatter. Derive them from the body.

--- Artefact 1 (md+YAML)
```
---
type: decision
title: Fire-and-forget enqueue semantics for v1
author: api
at: 2026-01-10T09:00:00Z
summary: API does not learn about send success or failure in v1; the queue is the contract boundary.
status: accepted
affects: [welcome-email-job]
---

## Decision

The API does not wait for, or learn about, the worker's send outcome. The successful enqueue is the API's only contract obligation. Send failures are observable only via worker logs and SES dashboards.

## Rationale

- v1 has no retry policy — a "failure" wouldn't trigger any API-side behaviour anyway.
- Coupling signup latency to SES availability is a poor trade in exchange for telemetry we can already get from the worker.
- Keeps the API's responsibility small and lets the worker evolve independently (retries, batching, multi-template) without an API release.

## Alternatives considered

- **Synchronous send from the API** — rejected. SES p99 is well above signup-latency budget.
- **Job-status callback to the API** — rejected for v1. No consumer; would only matter once we add retries.
- **Outbox pattern** — overkill until we have a transactional concern we don't have today.

## Consequences

- Worker is the source of truth for "did the email send."
- A worker outage stalls the pipeline silently from the API's perspective — operator alerting on queue depth and SES errors is the human-facing signal.
```

--- Artefact 2 (denser-md)
```
---
type: decision
title: Fire-and-forget enqueue semantics for v1
author: api
at: 2026-01-10T09:00:00Z
summary: API does not learn about send success or failure in v1; the queue is the contract boundary.
status: accepted
affects: [welcome-email-job]
rule: API never reads job status; successful enqueue is the API's only contract obligation. Send failures are observable only via worker logs and SES dashboards.
why:
  - v1 has no retry policy — a "failure" wouldn't trigger any API-side behaviour anyway
  - Coupling signup latency to SES availability is a poor trade for telemetry already available from worker
  - Keeps API responsibility small; worker evolves independently (retries, batching, multi-template) without API release
alternatives_rejected:
  - {option: synchronous send from API, reason: SES p99 well above signup-latency budget}
  - {option: job-status callback to API, reason: no consumer for v1; only matters when retries land}
  - {option: outbox pattern, reason: overkill until we have a transactional concern}
consequences:
  - Worker is source of truth for "did the email send"
  - Worker outage stalls pipeline silently from API's view — operator alerting on queue depth + SES errors is the signal
---
```

--- Artefact 3 (TOML)
```
type = "decision"
title = "Fire-and-forget enqueue semantics for v1"
author = "api"
at = "2026-01-10T09:00:00Z"
summary = "API does not learn about send success or failure in v1; the queue is the contract boundary."
status = "accepted"
affects = ["welcome-email-job"]

rule = "API never reads job status; successful enqueue is the API's only contract obligation. Send failures are observable only via worker logs and SES dashboards."

why = [
  "v1 has no retry policy — a failure wouldn't trigger any API-side behaviour anyway",
  "Coupling signup latency to SES availability is a poor trade for telemetry already available from worker",
  "Keeps API responsibility small; worker evolves independently (retries, batching, multi-template) without API release",
]

consequences = [
  "Worker is source of truth for \"did the email send\"",
  "Worker outage stalls pipeline silently from API's view — operator alerting on queue depth + SES errors is the signal",
]

[[alternatives_rejected]]
option = "synchronous send from API"
reason = "SES p99 well above signup-latency budget"

[[alternatives_rejected]]
option = "job-status callback to API"
reason = "no consumer for v1; only matters when retries land"

[[alternatives_rejected]]
option = "outbox pattern"
reason = "overkill until we have a transactional concern"
```

