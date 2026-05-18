You will receive 3 shared-context orchestrator-snapshot artefacts in 3 on-disk formats (md+YAML, denser-md, hybrid). Extract canonical fields as a JSON array of 3 objects in order. Return ONLY the JSON array.

Expected fields: type, author, at, status, summary, headline (string), where_each_repo_stands (map of repo to state/note), shipped_since_last[] (objects with what + ref), decisions_made[], open_for_human[], next_up (map of repo or "joint" to plan).

--- Artefact 1 (md+YAML)
```
---
type: orchestrator-snapshot
author: orchestrator
at: 2026-01-10T10:35:00Z
covers_since: null
status: done
trigger: digest-hook
trigger_digest: digest/2026-01-10T10-30-00-api.md
summary: Welcome-emails v1 is shipped — API enqueues on signup, worker sends via SES, staging verified, no open questions.
---

## Headline
v1 is end-to-end shipped: signup enqueues a `welcome-email` job, the worker dequeues it and sends through SES, staging is green, and there are no open cross-repo asks.

## Where each repo stands
- **api** — `POST /signup` enqueuing on `welcome-emails` against `welcome-email-job v1.0.0`. Tests green; staging verified. Done for v1.
- **worker** — consumer wired with payload validation and English-template fall-through for non-`en` locales. Staging end-to-end green. Done for v1.

## What shipped since the last snapshot
- API enqueue path live on staging — `log/2026-01-10T09-30-00-api-shipped.md`.
- Worker consumer + SES send + staging verification — `log/2026-01-10T10-15-00-worker-ack.md`.
- ADR pinning fire-and-forget semantics — `decisions/2026-01-10T09-00-00-fire-and-forget-semantics.md`.
- Wire contract published — `contracts/welcome-email-job/2026-01-10T09-00-00-api-v1.0.0.md`.

## Decisions made
- Fire-and-forget for v1 — API isn't told about send outcomes; the queue is the contract boundary. Trade-off: signup latency stays insulated from SES, in exchange for losing API-side telemetry on send failures.

## Open for the human
- Nothing — we're heads-down. v1 is ready for production rollout when the deploy slot opens.

## Next up
- **api**: nothing for v1. Pick up v2 retry semantics when scoped.
- **worker**: nothing for v1. Same.
- **Joint**: production deploy of both services in either order — fire-and-forget means there's no required sequencing.
```

--- Artefact 2 (denser-md)
```
---
type: orchestrator-snapshot
author: orchestrator
at: 2026-01-10T10:35:00Z
covers_since: null
status: done
trigger: digest-hook
trigger_digest: digest/2026-01-10T10-30-00-api.md
summary: Welcome-emails v1 is shipped — API enqueues on signup, worker sends via SES, staging verified, no open questions.
headline: v1 end-to-end shipped; signup enqueues a job, worker dequeues and sends through SES, staging green, no open cross-repo asks.
where_each_repo_stands:
  api: POST /signup enqueuing on welcome-emails against welcome-email-job v1.0.0; tests green; staging verified; done for v1.
  worker: consumer wired w/ payload validation and English-template fall-through for non-`en` locales; staging end-to-end green; done for v1.
shipped_since_last:
  - {what: API enqueue path live on staging, ref: log/2026-01-10T09-30-00-api-shipped.md}
  - {what: Worker consumer + SES send + staging verification, ref: log/2026-01-10T10-15-00-worker-ack.md}
  - {what: ADR pinning fire-and-forget semantics, ref: decisions/2026-01-10T09-00-00-fire-and-forget-semantics.md}
  - {what: Wire contract published, ref: contracts/welcome-email-job/2026-01-10T09-00-00-api-v1.0.0.md}
decisions_made:
  - Fire-and-forget for v1; queue is contract boundary; signup latency insulated from SES at cost of API-side send telemetry.
open_for_human: []
next_up:
  api: nothing for v1; pick up v2 retry semantics when scoped
  worker: nothing for v1; same
  joint: production deploy of both services in either order — fire-and-forget means no required sequencing
---
```

--- Artefact 3 (hybrid)
```
---
type: orchestrator-snapshot
author: orchestrator
at: 2026-01-10T10:35:00Z
covers_since: null
status: done
trigger: digest-hook
trigger_digest: digest/2026-01-10T10-30-00-api.md
summary: Welcome-emails v1 is shipped — API enqueues on signup, worker sends via SES, staging verified, no open questions.
where_each_repo_stands:
  api:
    state: done
    note: POST /signup enqueuing on welcome-emails against welcome-email-job v1.0.0; tests green; staging verified
  worker:
    state: done
    note: consumer wired w/ payload validation and English-template fall-through for non-`en` locales; staging end-to-end green
open_for_human: []
---

## Headline
v1 is end-to-end shipped: signup enqueues a `welcome-email` job, the worker dequeues it and sends through SES, staging is green, and there are no open cross-repo asks.

## What shipped since the last snapshot
- API enqueue path live on staging — `log/2026-01-10T09-30-00-api-shipped.md`.
- Worker consumer + SES send + staging verification — `log/2026-01-10T10-15-00-worker-ack.md`.
- ADR pinning fire-and-forget semantics — `decisions/2026-01-10T09-00-00-fire-and-forget-semantics.md`.
- Wire contract published — `contracts/welcome-email-job/2026-01-10T09-00-00-api-v1.0.0.md`.

## Decisions made
- Fire-and-forget for v1 — API isn't told about send outcomes; the queue is the contract boundary. Trade-off: signup latency stays insulated from SES, in exchange for losing API-side telemetry on send failures.

## Next up
- **api**: nothing for v1. Pick up v2 retry semantics when scoped.
- **worker**: nothing for v1. Same.
- **Joint**: production deploy of both services in either order — fire-and-forget means there's no required sequencing.
```

