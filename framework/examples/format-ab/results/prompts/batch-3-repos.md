You will receive 6 shared-context repo-status artefacts. They cover 2 repos (api, worker) × 3 on-disk formats (md+YAML, yaml-only frontmatter, TOML). Extract canonical fields as a JSON array of 6 objects in order. Return ONLY the JSON array.

Expected fields: type, repo, at, summary, current_goal (may be absent in md+YAML — derive from body if needed), done[], next[], blocked_on[], contracts_in_play[] (objects with at least name + version), open_questions[].

--- Artefact 1 (md+YAML, api)
```
---
type: status
repo: api
at: 2026-01-10T09:30:00Z
summary: v1 enqueue shipped on main; awaiting worker ack and joint staging verification.
---

## Current goal

Enqueue a `welcome-email` job on every successful signup. Done.

## Done

- `POST /signup` enqueues against `welcome-email-job v1.0.0`.
- ADR for fire-and-forget semantics published.
- Unit + integration tests green.

## Next

- Joint staging signup test once worker confirms it's consuming.
- Nothing else on the API side for v1.

## Blocked on

- Nothing.

## Contracts in play

- `welcome-email-job v1.0.0` — owned by API, consumed by worker.

## Open questions for others

- `worker`: confirm consumer is wired and non-`en` locales fall through cleanly. Asked in [`log/2026-01-10T09-30-00-api-shipped.md`](../../log/2026-01-10T09-30-00-api-shipped.md).
```

--- Artefact 2 (md+YAML, worker)
```
---
type: status
repo: worker
at: 2026-01-10T10:15:00Z
summary: Consumer wired against v1.0.0 and verified end-to-end on staging.
---

## Current goal

Consume `welcome-emails` and send via SES. Done.

## Done

- Consumer for the `welcome-emails` queue.
- Payload validation against `welcome-email-job v1.0.0`; bad-shape jobs go to DLQ.
- Non-`en` locales fall through to English with a debug log.
- End-to-end staging test green.

## Next

- v2 retry policy when we get to it. No work pending for v1.

## Blocked on

- Nothing.

## Contracts in play

- `welcome-email-job v1.0.0` — consumed.

## Open questions for others

- None.
```

--- Artefact 3 (yaml-only, api)
```
---
type: status
repo: api
at: 2026-01-10T09:30:00Z
summary: v1 enqueue shipped on main; awaiting worker ack and joint staging verification.
current_goal: Enqueue a welcome-email job on every successful signup. Done.
done:
  - POST /signup enqueues against welcome-email-job v1.0.0
  - ADR for fire-and-forget semantics published
  - Unit + integration tests green
next:
  - Joint staging signup test once worker confirms it's consuming
  - Nothing else on the API side for v1
blocked_on: []
contracts_in_play:
  - {name: welcome-email-job, version: 1.0.0, role: owner, consumer: worker}
open_questions:
  - {to: worker, ask: "confirm consumer is wired and non-`en` locales fall through cleanly", in: log/2026-01-10T09-30-00-api-shipped.md}
---
```

--- Artefact 4 (yaml-only, worker)
```
---
type: status
repo: worker
at: 2026-01-10T10:15:00Z
summary: Consumer wired against v1.0.0 and verified end-to-end on staging.
current_goal: Consume welcome-emails and send via SES. Done.
done:
  - Consumer for the welcome-emails queue
  - Payload validation against welcome-email-job v1.0.0; bad-shape jobs go to DLQ
  - Non-`en` locales fall through to English with a debug log
  - End-to-end staging test green
next:
  - v2 retry policy when we get to it; no work pending for v1
blocked_on: []
contracts_in_play:
  - {name: welcome-email-job, version: 1.0.0, role: consumer}
open_questions: []
---
```

--- Artefact 5 (TOML, api)
```
type = "status"
repo = "api"
at = "2026-01-10T09:30:00Z"
summary = "v1 enqueue shipped on main; awaiting worker ack and joint staging verification."
current_goal = "Enqueue a welcome-email job on every successful signup. Done."
done = [
  "POST /signup enqueues against welcome-email-job v1.0.0",
  "ADR for fire-and-forget semantics published",
  "Unit + integration tests green",
]
next = [
  "Joint staging signup test once worker confirms it's consuming",
  "Nothing else on the API side for v1",
]
blocked_on = []

[[contracts_in_play]]
name = "welcome-email-job"
version = "1.0.0"
role = "owner"
consumer = "worker"

[[open_questions]]
to = "worker"
ask = "confirm consumer is wired and non-`en` locales fall through cleanly"
in = "log/2026-01-10T09-30-00-api-shipped.md"
```

--- Artefact 6 (TOML, worker)
```
type = "status"
repo = "worker"
at = "2026-01-10T10:15:00Z"
summary = "Consumer wired against v1.0.0 and verified end-to-end on staging."
current_goal = "Consume welcome-emails and send via SES. Done."
done = [
  "Consumer for the welcome-emails queue",
  "Payload validation against welcome-email-job v1.0.0; bad-shape jobs go to DLQ",
  "Non-`en` locales fall through to English with a debug log",
  "End-to-end staging test green",
]
next = ["v2 retry policy when we get to it; no work pending for v1"]
blocked_on = []
open_questions = []

[[contracts_in_play]]
name = "welcome-email-job"
version = "1.0.0"
role = "consumer"
```

