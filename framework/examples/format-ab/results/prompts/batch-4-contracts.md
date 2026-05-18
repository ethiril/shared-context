You will receive 3 shared-context contract artefacts in 3 on-disk formats (md+YAML, TOML, JSON Schema). Extract canonical fields as a JSON array of 3 objects in order. Return ONLY the JSON array.

Expected fields: type, name, version, author, at, summary, consumers[], breaking (bool), status, queue (object with name, backend, visibility_timeout_seconds), payload_fields (map: field_name → {type, required, notes}), expectations (map with producer, consumer, coupling).

For the JSON Schema artefact: lift fields from x-meta, x-queue, x-expectations extensions into the canonical positions.

--- Artefact 1 (md+YAML)
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

--- Artefact 2 (TOML)
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

--- Artefact 3 (JSON Schema)
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

