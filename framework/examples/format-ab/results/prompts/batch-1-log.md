You will receive 5 shared-context log artefacts in 3 different on-disk formats (md+YAML, TOML, JSONL). The JSONL artefact contains 2 events; the others are 1 event each. Extract canonical fields as a JSON array of 6 objects, in the order the artefacts appear (the JSONL artefact yields 2 elements at its position). Return ONLY the JSON array, no prose.

Expected fields per object: type, kind, from, at, to[], summary, refs[] (may be empty), body.

--- Artefact 1 (md+YAML, api-shipped)
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

--- Artefact 2 (md+YAML, worker-ack)
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

--- Artefact 3 (TOML, api-shipped)
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

--- Artefact 4 (TOML, worker-ack)
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

--- Artefact 5 (JSONL, 2 events — yield 2 array elements in order)
```
{"type":"log","kind":"contract-change","from":"api","at":"2026-01-10T09:30:00Z","to":["worker"],"summary":"POST /signup now enqueues welcome-email jobs against welcome-email-job v1.0.0.","refs":["contracts/welcome-email-job/2026-01-10T09-00-00-api-v1.0.0.md","decisions/2026-01-10T09-00-00-fire-and-forget-semantics.md"],"body":"POST /signup enqueues a welcome-email job after the user row commits. Payload shape per welcome-email-job v1.0.0. Fire-and-forget — no retry, no callback. See the ADR for why.\n\n@worker: please confirm you can dequeue against this shape and that locales other than `en` are tolerated as no-ops for v1. Reply via a kind:answer log entry referencing this file."}
{"type":"log","kind":"answer","from":"worker","at":"2026-01-10T10:15:00Z","to":["api"],"summary":"Consumer wired against v1.0.0; non-`en` locales fall through to English with a debug log line.","refs":["log/2026-01-10T09-30-00-api-shipped.md","contracts/welcome-email-job/2026-01-10T09-00-00-api-v1.0.0.md"],"body":"Consumer for the welcome-emails queue is wired. Payload validated against v1.0.0; rejects on missing userId/email (drops to dead-letter), tolerates any locale value (anything other than `en` triggers a debug log line and uses the English template).\n\nSanity-checked end-to-end against a staging signup: job dequeued, SES send returned 200, log line as expected.\n\nNo follow-up needed from api for v1. Will pick up retry semantics when we get to v2."}
```

