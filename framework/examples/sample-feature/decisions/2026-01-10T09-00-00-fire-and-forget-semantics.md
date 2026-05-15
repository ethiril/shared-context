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
