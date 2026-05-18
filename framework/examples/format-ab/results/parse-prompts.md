# Parse-reliability prompts

Run each prompt in a fresh Claude Code session (or against each model tier you care about). Record per-prompt PASS/FAIL in the ADR's per-artefact table.


## `framework/examples/sample-feature/log/2026-01-10T09-30-00-api-shipped.md`  (artefact: log, variant: md-yaml)

You are given a single shared-context artefact in md-yaml format. Extract
its canonical fields as JSON. Return ONLY the JSON object, no prose.

Expected fields for `log`:
- type (string)
- kind (string)
- from (string)
- at (ISO timestamp)
- to (array of strings)
- summary (string)
- refs (array of strings; may be absent)
- body (string)

Artefact:
```
---
type: log
kind: contract-change
from: api
at: 2026-01-10T09:30:00Z
to: [worker]
summary: POST /signup now enqueues welcome-email jobs against welcome-email-job v1.0.0.
refs:
  - contracts/welcome-email-job/2026-01-10T09-00-00-api-v1.0.0.md
  - decisions/2026-01-10T09-00-00-fire-and-forget-semantics.md
---
`POST /signup` enqueues a `welcome-email` job after the user row commits. Payload shape per `welcome-email-job v1.0.0`. Fire-and-forget — no retry, no callback. See the ADR for why.

@worker: please confirm you can dequeue against this shape and that locales other than `en` are tolerated as no-ops for v1. Reply via a `kind: answer` log entry referencing this file.

```


## `framework/examples/sample-feature/log/2026-01-10T10-15-00-worker-ack.md`  (artefact: log, variant: md-yaml)

You are given a single shared-context artefact in md-yaml format. Extract
its canonical fields as JSON. Return ONLY the JSON object, no prose.

Expected fields for `log`:
- type (string)
- kind (string)
- from (string)
- at (ISO timestamp)
- to (array of strings)
- summary (string)
- refs (array of strings; may be absent)
- body (string)

Artefact:
```
---
type: log
kind: answer
from: worker
at: 2026-01-10T10:15:00Z
to: [api]
summary: Consumer wired against v1.0.0; non-`en` locales fall through to English with a debug log line.
refs:
  - log/2026-01-10T09-30-00-api-shipped.md
  - contracts/welcome-email-job/2026-01-10T09-00-00-api-v1.0.0.md
---
Consumer for the `welcome-emails` queue is wired. Payload validated against v1.0.0; rejects on missing `userId` / `email` (drops to dead-letter), tolerates any `locale` value (anything other than `en` triggers a debug log line and uses the English template).

Sanity-checked end-to-end against a staging signup: job dequeued, SES `send` returned 200, log line as expected.

No follow-up needed from `api` for v1. Will pick up retry semantics when we get to v2.

```


## `framework/examples/format-ab/log/toml/2026-01-10T09-30-00-api-shipped.toml`  (artefact: log, variant: toml)

You are given a single shared-context artefact in toml format. Extract
its canonical fields as JSON. Return ONLY the JSON object, no prose.

Expected fields for `log`:
- type (string)
- kind (string)
- from (string)
- at (ISO timestamp)
- to (array of strings)
- summary (string)
- refs (array of strings; may be absent)
- body (string)

Artefact:
```
type = "log"
kind = "contract-change"
from = "api"
at = "2026-01-10T09:30:00Z"
to = ["worker"]
summary = "POST /signup now enqueues welcome-email jobs against welcome-email-job v1.0.0."
refs = [
  "contracts/welcome-email-job/2026-01-10T09-00-00-api-v1.0.0.md",
  "decisions/2026-01-10T09-00-00-fire-and-forget-semantics.md",
]
body = """
`POST /signup` enqueues a `welcome-email` job after the user row commits. Payload shape per `welcome-email-job v1.0.0`. Fire-and-forget — no retry, no callback. See the ADR for why.

@worker: please confirm you can dequeue against this shape and that locales other than `en` are tolerated as no-ops for v1. Reply via a `kind: answer` log entry referencing this file.
"""

```


## `framework/examples/format-ab/log/toml/2026-01-10T10-15-00-worker-ack.toml`  (artefact: log, variant: toml)

You are given a single shared-context artefact in toml format. Extract
its canonical fields as JSON. Return ONLY the JSON object, no prose.

Expected fields for `log`:
- type (string)
- kind (string)
- from (string)
- at (ISO timestamp)
- to (array of strings)
- summary (string)
- refs (array of strings; may be absent)
- body (string)

Artefact:
```
type = "log"
kind = "answer"
from = "worker"
at = "2026-01-10T10:15:00Z"
to = ["api"]
summary = "Consumer wired against v1.0.0; non-`en` locales fall through to English with a debug log line."
refs = [
  "log/2026-01-10T09-30-00-api-shipped.md",
  "contracts/welcome-email-job/2026-01-10T09-00-00-api-v1.0.0.md",
]
body = """
Consumer for the `welcome-emails` queue is wired. Payload validated against v1.0.0; rejects on missing `userId` / `email` (drops to dead-letter), tolerates any `locale` value (anything other than `en` triggers a debug log line and uses the English template).

Sanity-checked end-to-end against a staging signup: job dequeued, SES `send` returned 200, log line as expected.

No follow-up needed from `api` for v1. Will pick up retry semantics when we get to v2.
"""

```


## `framework/examples/format-ab/log/jsonl/log.jsonl`  (artefact: log, variant: jsonl)

You are given a single shared-context artefact in jsonl format. Extract
its canonical fields as JSON. Return ONLY the JSON object, no prose.

Expected fields for `log`:
- type (string)
- kind (string)
- from (string)
- at (ISO timestamp)
- to (array of strings)
- summary (string)
- refs (array of strings; may be absent)
- body (string)

Artefact:
```
{"type":"log","kind":"contract-change","from":"api","at":"2026-01-10T09:30:00Z","to":["worker"],"summary":"POST /signup now enqueues welcome-email jobs against welcome-email-job v1.0.0.","refs":["contracts/welcome-email-job/2026-01-10T09-00-00-api-v1.0.0.md","decisions/2026-01-10T09-00-00-fire-and-forget-semantics.md"],"body":"POST /signup enqueues a welcome-email job after the user row commits. Payload shape per welcome-email-job v1.0.0. Fire-and-forget — no retry, no callback. See the ADR for why.\n\n@worker: please confirm you can dequeue against this shape and that locales other than `en` are tolerated as no-ops for v1. Reply via a kind:answer log entry referencing this file."}
{"type":"log","kind":"answer","from":"worker","at":"2026-01-10T10:15:00Z","to":["api"],"summary":"Consumer wired against v1.0.0; non-`en` locales fall through to English with a debug log line.","refs":["log/2026-01-10T09-30-00-api-shipped.md","contracts/welcome-email-job/2026-01-10T09-00-00-api-v1.0.0.md"],"body":"Consumer for the welcome-emails queue is wired. Payload validated against v1.0.0; rejects on missing userId/email (drops to dead-letter), tolerates any locale value (anything other than `en` triggers a debug log line and uses the English template).\n\nSanity-checked end-to-end against a staging signup: job dequeued, SES send returned 200, log line as expected.\n\nNo follow-up needed from api for v1. Will pick up retry semantics when we get to v2."}

```


## `framework/examples/sample-feature/digest/2026-01-10T10-30-00-api.md`  (artefact: digest, variant: md-yaml)

You are given a single shared-context artefact in md-yaml format. Extract
its canonical fields as JSON. Return ONLY the JSON object, no prose.

Expected fields for `digest`:
- type (string)
- author (string)
- at (ISO timestamp)
- summary (string)
- feature (string; may be absent)
- per_repo (map of repo to status)
- contracts_active (array of strings)
- decisions_live (array of strings)
- open_cross_repo (array)
- shipped_since_bootstrap (array of objects)

Artefact:
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


## `framework/examples/format-ab/digest/denser-md/2026-01-10T10-30-00-api.md`  (artefact: digest, variant: denser-md)

You are given a single shared-context artefact in denser-md format. Extract
its canonical fields as JSON. Return ONLY the JSON object, no prose.

Expected fields for `digest`:
- type (string)
- author (string)
- at (ISO timestamp)
- summary (string)
- feature (string; may be absent)
- per_repo (map of repo to status)
- contracts_active (array of strings)
- decisions_live (array of strings)
- open_cross_repo (array)
- shipped_since_bootstrap (array of objects)

Artefact:
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


## `framework/examples/format-ab/digest/toml/2026-01-10T10-30-00-api.toml`  (artefact: digest, variant: toml)

You are given a single shared-context artefact in toml format. Extract
its canonical fields as JSON. Return ONLY the JSON object, no prose.

Expected fields for `digest`:
- type (string)
- author (string)
- at (ISO timestamp)
- summary (string)
- feature (string; may be absent)
- per_repo (map of repo to status)
- contracts_active (array of strings)
- decisions_live (array of strings)
- open_cross_repo (array)
- shipped_since_bootstrap (array of objects)

Artefact:
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


## `framework/examples/sample-feature/repos/api/2026-01-10T09-30-00.md`  (artefact: repos, variant: md-yaml)

You are given a single shared-context artefact in md-yaml format. Extract
its canonical fields as JSON. Return ONLY the JSON object, no prose.

Expected fields for `repos`:
- type (string)
- repo (string)
- at (ISO timestamp)
- summary (string)
- done (array of strings)
- next (array of strings)
- blocked_on (array)
- contracts_in_play (array of objects)
- open_questions (array of objects)

Artefact:
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


## `framework/examples/sample-feature/repos/worker/2026-01-10T10-15-00.md`  (artefact: repos, variant: md-yaml)

You are given a single shared-context artefact in md-yaml format. Extract
its canonical fields as JSON. Return ONLY the JSON object, no prose.

Expected fields for `repos`:
- type (string)
- repo (string)
- at (ISO timestamp)
- summary (string)
- done (array of strings)
- next (array of strings)
- blocked_on (array)
- contracts_in_play (array of objects)
- open_questions (array of objects)

Artefact:
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


## `framework/examples/format-ab/repos/yaml-only/api-2026-01-10T09-30-00.md`  (artefact: repos, variant: yaml-only)

You are given a single shared-context artefact in yaml-only format. Extract
its canonical fields as JSON. Return ONLY the JSON object, no prose.

Expected fields for `repos`:
- type (string)
- repo (string)
- at (ISO timestamp)
- summary (string)
- done (array of strings)
- next (array of strings)
- blocked_on (array)
- contracts_in_play (array of objects)
- open_questions (array of objects)

Artefact:
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


## `framework/examples/format-ab/repos/yaml-only/worker-2026-01-10T10-15-00.md`  (artefact: repos, variant: yaml-only)

You are given a single shared-context artefact in yaml-only format. Extract
its canonical fields as JSON. Return ONLY the JSON object, no prose.

Expected fields for `repos`:
- type (string)
- repo (string)
- at (ISO timestamp)
- summary (string)
- done (array of strings)
- next (array of strings)
- blocked_on (array)
- contracts_in_play (array of objects)
- open_questions (array of objects)

Artefact:
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


## `framework/examples/format-ab/repos/toml/api-2026-01-10T09-30-00.toml`  (artefact: repos, variant: toml)

You are given a single shared-context artefact in toml format. Extract
its canonical fields as JSON. Return ONLY the JSON object, no prose.

Expected fields for `repos`:
- type (string)
- repo (string)
- at (ISO timestamp)
- summary (string)
- done (array of strings)
- next (array of strings)
- blocked_on (array)
- contracts_in_play (array of objects)
- open_questions (array of objects)

Artefact:
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


## `framework/examples/format-ab/repos/toml/worker-2026-01-10T10-15-00.toml`  (artefact: repos, variant: toml)

You are given a single shared-context artefact in toml format. Extract
its canonical fields as JSON. Return ONLY the JSON object, no prose.

Expected fields for `repos`:
- type (string)
- repo (string)
- at (ISO timestamp)
- summary (string)
- done (array of strings)
- next (array of strings)
- blocked_on (array)
- contracts_in_play (array of objects)
- open_questions (array of objects)

Artefact:
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


## `framework/examples/sample-feature/contracts/welcome-email-job/2026-01-10T09-00-00-api-v1.0.0.md`  (artefact: contracts, variant: md-yaml)

You are given a single shared-context artefact in md-yaml format. Extract
its canonical fields as JSON. Return ONLY the JSON object, no prose.

Expected fields for `contracts`:
- type (string)
- name (string)
- version (string)
- author (string)
- at (ISO timestamp)
- summary (string)
- consumers (array of strings)
- breaking (bool)
- status (string)
- payload_fields (map of field to {type, required, notes})

Artefact:
```
---
type: contract
name: welcome-email-job
version: 1.0.0
author: api
at: 2026-01-10T09:00:00Z
summary: v1 job schema — userId, email, locale. Enqueued on signup by API; consumed by worker.
consumers: [worker]
breaking: false
status: active
---

# welcome-email-job v1.0.0

## Queue

- Name: `welcome-emails`
- Backend: existing Redis-backed `bull` queue.
- Visibility timeout: 30 s.

## Payload (JSON)

```json
{
  "userId": "u_abc123",
  "email": "user@example.com",
  "locale": "en"
}
```

| Field   | Type   | Required | Notes                                      |
|---------|--------|----------|--------------------------------------------|
| userId  | string | yes      | Stable user identifier (UUIDv4 or ULID).   |
| email   | string | yes      | RFC 5322 address.                          |
| locale  | string | yes      | BCP-47. v1 worker treats any value as `en`. |

## Producer / consumer expectations

- API enqueues exactly once per successful signup. No deduplication on the API side.
- Worker is responsible for idempotency if it adds retry in v2 (no requirement for v1).
- Fire-and-forget: API never reads job status.

```


## `framework/examples/format-ab/contracts/toml/welcome-email-job-v1.0.0.toml`  (artefact: contracts, variant: toml)

You are given a single shared-context artefact in toml format. Extract
its canonical fields as JSON. Return ONLY the JSON object, no prose.

Expected fields for `contracts`:
- type (string)
- name (string)
- version (string)
- author (string)
- at (ISO timestamp)
- summary (string)
- consumers (array of strings)
- breaking (bool)
- status (string)
- payload_fields (map of field to {type, required, notes})

Artefact:
```
type = "contract"
name = "welcome-email-job"
version = "1.0.0"
author = "api"
at = "2026-01-10T09:00:00Z"
summary = "v1 job schema — userId, email, locale. Enqueued on signup by API; consumed by worker."
consumers = ["worker"]
breaking = false
status = "active"

[queue]
name = "welcome-emails"
backend = "Redis-backed bull queue (existing)"
visibility_timeout_seconds = 30

[payload.fields]
userId = { type = "string", required = true, notes = "Stable user identifier (UUIDv4 or ULID)." }
email  = { type = "string", required = true, notes = "RFC 5322 address." }
locale = { type = "string", required = true, notes = "BCP-47. v1 worker treats any value as `en`." }

[payload.example]
userId = "u_abc123"
email = "user@example.com"
locale = "en"

[expectations]
producer = "API enqueues exactly once per successful signup. No deduplication on the API side."
consumer = "Worker is responsible for idempotency if it adds retry in v2 (no requirement for v1)."
coupling = "Fire-and-forget: API never reads job status."

```


## `framework/examples/format-ab/contracts/json-schema/welcome-email-job-v1.0.0.json`  (artefact: contracts, variant: json-schema)

You are given a single shared-context artefact in json-schema format. Extract
its canonical fields as JSON. Return ONLY the JSON object, no prose.

Expected fields for `contracts`:
- type (string)
- name (string)
- version (string)
- author (string)
- at (ISO timestamp)
- summary (string)
- consumers (array of strings)
- breaking (bool)
- status (string)
- payload_fields (map of field to {type, required, notes})

Artefact:
```
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "shared-context/contracts/welcome-email-job/v1.0.0",
  "title": "welcome-email-job v1.0.0",
  "type": "object",
  "x-meta": {
    "type": "contract",
    "name": "welcome-email-job",
    "version": "1.0.0",
    "author": "api",
    "at": "2026-01-10T09:00:00Z",
    "summary": "v1 job schema — userId, email, locale. Enqueued on signup by API; consumed by worker.",
    "consumers": ["worker"],
    "breaking": false,
    "status": "active"
  },
  "x-queue": {
    "name": "welcome-emails",
    "backend": "Redis-backed bull queue (existing)",
    "visibility_timeout_seconds": 30
  },
  "x-expectations": {
    "producer": "API enqueues exactly once per successful signup. No deduplication on the API side.",
    "consumer": "Worker is responsible for idempotency if it adds retry in v2 (no requirement for v1).",
    "coupling": "Fire-and-forget: API never reads job status."
  },
  "required": ["userId", "email", "locale"],
  "additionalProperties": false,
  "properties": {
    "userId": {
      "type": "string",
      "description": "Stable user identifier (UUIDv4 or ULID)."
    },
    "email": {
      "type": "string",
      "format": "email",
      "description": "RFC 5322 address."
    },
    "locale": {
      "type": "string",
      "description": "BCP-47. v1 worker treats any value as `en`."
    }
  },
  "examples": [
    { "userId": "u_abc123", "email": "user@example.com", "locale": "en" }
  ]
}

```


## `framework/examples/sample-feature/decisions/2026-01-10T09-00-00-fire-and-forget-semantics.md`  (artefact: decisions, variant: md-yaml)

You are given a single shared-context artefact in md-yaml format. Extract
its canonical fields as JSON. Return ONLY the JSON object, no prose.

Expected fields for `decisions`:
- type (string)
- title (string)
- author (string)
- at (ISO timestamp)
- summary (string)
- status (string)
- affects (array of strings)
- rule (string)
- why (array of strings)
- alternatives_rejected (array of objects)
- consequences (array of strings)

Artefact:
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


## `framework/examples/format-ab/decisions/denser-md/2026-01-10T09-00-00-fire-and-forget-semantics.md`  (artefact: decisions, variant: denser-md)

You are given a single shared-context artefact in denser-md format. Extract
its canonical fields as JSON. Return ONLY the JSON object, no prose.

Expected fields for `decisions`:
- type (string)
- title (string)
- author (string)
- at (ISO timestamp)
- summary (string)
- status (string)
- affects (array of strings)
- rule (string)
- why (array of strings)
- alternatives_rejected (array of objects)
- consequences (array of strings)

Artefact:
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


## `framework/examples/format-ab/decisions/toml/2026-01-10T09-00-00-fire-and-forget-semantics.toml`  (artefact: decisions, variant: toml)

You are given a single shared-context artefact in toml format. Extract
its canonical fields as JSON. Return ONLY the JSON object, no prose.

Expected fields for `decisions`:
- type (string)
- title (string)
- author (string)
- at (ISO timestamp)
- summary (string)
- status (string)
- affects (array of strings)
- rule (string)
- why (array of strings)
- alternatives_rejected (array of objects)
- consequences (array of strings)

Artefact:
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


## `framework/examples/sample-feature/orchestrator/2026-01-10T10-35-00-orchestrator.md`  (artefact: orchestrator, variant: md-yaml)

You are given a single shared-context artefact in md-yaml format. Extract
its canonical fields as JSON. Return ONLY the JSON object, no prose.

Expected fields for `orchestrator`:
- type (string)
- author (string)
- at (ISO timestamp)
- status (string)
- summary (string)
- headline (string)
- where_each_repo_stands (map of repo to status)
- shipped_since_last (array of objects)
- decisions_made (array of strings)
- open_for_human (array)
- next_up (map of repo to plan)

Artefact:
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


## `framework/examples/format-ab/orchestrator/denser-md/2026-01-10T10-35-00-orchestrator.md`  (artefact: orchestrator, variant: denser-md)

You are given a single shared-context artefact in denser-md format. Extract
its canonical fields as JSON. Return ONLY the JSON object, no prose.

Expected fields for `orchestrator`:
- type (string)
- author (string)
- at (ISO timestamp)
- status (string)
- summary (string)
- headline (string)
- where_each_repo_stands (map of repo to status)
- shipped_since_last (array of objects)
- decisions_made (array of strings)
- open_for_human (array)
- next_up (map of repo to plan)

Artefact:
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


## `framework/examples/format-ab/orchestrator/hybrid/2026-01-10T10-35-00-orchestrator.md`  (artefact: orchestrator, variant: hybrid)

You are given a single shared-context artefact in hybrid format. Extract
its canonical fields as JSON. Return ONLY the JSON object, no prose.

Expected fields for `orchestrator`:
- type (string)
- author (string)
- at (ISO timestamp)
- status (string)
- summary (string)
- headline (string)
- where_each_repo_stands (map of repo to status)
- shipped_since_last (array of objects)
- decisions_made (array of strings)
- open_for_human (array)
- next_up (map of repo to plan)

Artefact:
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

