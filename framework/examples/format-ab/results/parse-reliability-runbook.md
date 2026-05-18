# Parse-reliability runbook

End-to-end runbook for the parse-reliability half of the A/B. Run this twice — once per model tier (Opus 4.7 and Haiku 4.5 minimum) — and record per-prompt PASS/FAIL in the table at the bottom. The token-cost half is already complete (see `token-comparison.md`).

## Setup

1. **Open a fresh Claude Code session.** CWD doesn't matter — this is pure prompting; no tool calls.
2. **Switch model.** `/model` → pick the tier (start with Haiku 4.5 — cheaper turnaround). Run all 6 batches, record, then `/model` → Opus 4.7 and repeat.
3. **`/clear` between batches** so cross-prompt priming doesn't leak.

## The 6 batches (pre-built, copy-paste-ready)

Each batch is a self-contained prompt with all variants inlined. From the shared-context root:

| Batch | File | Artefacts | Quick copy |
|---|---|---|---|
| 1 | `prompts/batch-1-log.md` | 5 log fixtures × 3 formats → 6 JSON elements | `cat framework/examples/format-ab/results/prompts/batch-1-log.md \| pbcopy` |
| 2 | `prompts/batch-2-digest.md` | 3 digest fixtures × 3 formats | `cat framework/examples/format-ab/results/prompts/batch-2-digest.md \| pbcopy` |
| 3 | `prompts/batch-3-repos.md` | 6 repo-status fixtures (2 repos × 3 formats) | `cat framework/examples/format-ab/results/prompts/batch-3-repos.md \| pbcopy` |
| 4 | `prompts/batch-4-contracts.md` | 3 contract fixtures × 3 formats | `cat framework/examples/format-ab/results/prompts/batch-4-contracts.md \| pbcopy` |
| 5 | `prompts/batch-5-decisions.md` | 3 ADR fixtures × 3 formats | `cat framework/examples/format-ab/results/prompts/batch-5-decisions.md \| pbcopy` |
| 6 | `prompts/batch-6-orchestrator.md` | 3 snapshot fixtures × 3 formats | `cat framework/examples/format-ab/results/prompts/batch-6-orchestrator.md \| pbcopy` |

**Per batch:** copy → paste into Claude Code → save the JSON array Claude returns → compare each element to the canonical reference below → record PASS/PARTIAL/FAIL in the results table.

To regenerate batch files after editing fixtures: `./framework/bin/build-parse-batches.sh`.

## Scoring rubric (per artefact, per format, per tier)

| Outcome | Definition | Score |
|---|---|---|
| PASS | Every canonical structured field present with correct type and value; body field semantically equivalent (substring or paraphrase ok). | ✅ |
| PARTIAL | All structured fields present, but body misses a substantive point OR adds a hallucinated field. | ⚠️ |
| FAIL | Any structured field missing, wrong type, or wrong value. | ❌ |

Body wording mismatches don't count — only structured fields do.

---

## Canonical references — diff Claude's output against these

### Batch 1 — `log/` (expect 6 elements)

1. **api-shipped** — `{type: log, kind: contract-change, from: api, at: 2026-01-10T09:30:00Z, to: [worker], summary: "POST /signup now enqueues welcome-email jobs against welcome-email-job v1.0.0.", refs: [contracts/welcome-email-job/2026-01-10T09-00-00-api-v1.0.0.md, decisions/2026-01-10T09-00-00-fire-and-forget-semantics.md], body: ~"POST /signup enqueues … fire-and-forget … @worker please confirm dequeue + non-en tolerance"}`
2. **worker-ack** — `{type: log, kind: answer, from: worker, at: 2026-01-10T10:15:00Z, to: [api], summary: "Consumer wired against v1.0.0; non-en locales fall through to English with a debug log line.", refs: [log/2026-01-10T09-30-00-api-shipped.md, contracts/welcome-email-job/2026-01-10T09-00-00-api-v1.0.0.md], body: ~"consumer wired; payload validated; bad shape → DLQ; staging end-to-end green; no follow-up for v1"}`
3. **api-shipped (TOML)** — identical to (1).
4. **worker-ack (TOML)** — identical to (2).
5. **api-shipped (JSONL element 1)** — identical to (1).
6. **worker-ack (JSONL element 2)** — identical to (2).

### Batch 2 — `digest/` (expect 3 elements, identical content)

```json
{
  "type": "digest",
  "author": "api",
  "at": "2026-01-10T10:30:00Z",
  "summary": "v1 welcome-email pipeline shipped end-to-end on staging; both repos green, no open cross-repo questions.",
  "per_repo": {
    "api": "shipped — POST /signup enqueuing against welcome-email-job v1.0.0; tests green; staging verified; not blocked",
    "worker": "consumer wired; payload validated; non-en locales fall through; staging green; not blocked"
  },
  "contracts_active": ["contracts/welcome-email-job/2026-01-10T09-00-00-api-v1.0.0.md"],
  "decisions_live": ["decisions/2026-01-10T09-00-00-fire-and-forget-semantics.md"],
  "open_cross_repo": [],
  "shipped_since_bootstrap": [
    {"repo": "api", "what": "POST /signup enqueue path", "ref": "log/2026-01-10T09-30-00-api-shipped.md"},
    {"repo": "worker", "what": "consumer + SES send + staging verification", "ref": "log/2026-01-10T10-15-00-worker-ack.md"}
  ],
  "where_to_look": {
    "wire_format": "contracts/welcome-email-job/...v1.0.0.md",
    "why_fire_and_forget": "decisions/2026-01-10T09-00-00-fire-and-forget-semantics.md",
    "per_repo_state": "repos/api/..., repos/worker/..."
  }
}
```

### Batch 3 — `repos/` (expect 6 elements; alternates api/worker)

Elements 1, 3, 5 (api):
```json
{
  "type": "status",
  "repo": "api",
  "at": "2026-01-10T09:30:00Z",
  "summary": "v1 enqueue shipped on main; awaiting worker ack and joint staging verification.",
  "current_goal": "Enqueue a welcome-email job on every successful signup.",
  "done": [
    "POST /signup enqueues against welcome-email-job v1.0.0",
    "ADR for fire-and-forget semantics published",
    "Unit + integration tests green"
  ],
  "next": [
    "Joint staging signup test once worker confirms it's consuming",
    "Nothing else on the API side for v1"
  ],
  "blocked_on": [],
  "contracts_in_play": [
    {"name": "welcome-email-job", "version": "1.0.0", "role": "owner", "consumer": "worker"}
  ],
  "open_questions": [
    {"to": "worker", "ask": "confirm consumer is wired and non-en locales fall through cleanly"}
  ]
}
```

Elements 2, 4, 6 (worker):
```json
{
  "type": "status",
  "repo": "worker",
  "at": "2026-01-10T10:15:00Z",
  "summary": "Consumer wired against v1.0.0 and verified end-to-end on staging.",
  "current_goal": "Consume welcome-emails and send via SES.",
  "done": [
    "Consumer for the welcome-emails queue",
    "Payload validation against welcome-email-job v1.0.0; bad-shape jobs go to DLQ",
    "Non-en locales fall through to English with a debug log",
    "End-to-end staging test green"
  ],
  "next": ["v2 retry policy when we get to it; no work pending for v1"],
  "blocked_on": [],
  "contracts_in_play": [
    {"name": "welcome-email-job", "version": "1.0.0", "role": "consumer"}
  ],
  "open_questions": []
}
```

### Batch 4 — `contracts/` (expect 3 elements, identical content)

```json
{
  "type": "contract",
  "name": "welcome-email-job",
  "version": "1.0.0",
  "author": "api",
  "at": "2026-01-10T09:00:00Z",
  "summary": "v1 job schema — userId, email, locale. Enqueued on signup by API; consumed by worker.",
  "consumers": ["worker"],
  "breaking": false,
  "status": "active",
  "queue": {
    "name": "welcome-emails",
    "backend": "Redis-backed bull queue (existing)",
    "visibility_timeout_seconds": 30
  },
  "payload_fields": {
    "userId": {"type": "string", "required": true, "notes": "Stable user identifier (UUIDv4 or ULID)."},
    "email":  {"type": "string", "required": true, "notes": "RFC 5322 address."},
    "locale": {"type": "string", "required": true, "notes": "BCP-47. v1 worker treats any value as `en`."}
  },
  "expectations": {
    "producer": "API enqueues exactly once per successful signup. No deduplication on the API side.",
    "consumer": "Worker is responsible for idempotency if it adds retry in v2 (no requirement for v1).",
    "coupling": "Fire-and-forget: API never reads job status."
  }
}
```

For artefact 3 (JSON Schema), the model must lift fields from `x-meta`, `x-queue`, `x-expectations` extensions into the canonical positions — trickiest extraction in the suite.

### Batch 5 — `decisions/` (expect 3 elements, identical content)

```json
{
  "type": "decision",
  "title": "Fire-and-forget enqueue semantics for v1",
  "author": "api",
  "at": "2026-01-10T09:00:00Z",
  "summary": "API does not learn about send success or failure in v1; the queue is the contract boundary.",
  "status": "accepted",
  "affects": ["welcome-email-job"],
  "rule": "API never reads job status; successful enqueue is the API's only contract obligation. Send failures are observable only via worker logs and SES dashboards.",
  "why": [
    "v1 has no retry policy — a failure wouldn't trigger any API-side behaviour anyway",
    "Coupling signup latency to SES availability is a poor trade for telemetry already available from worker",
    "Keeps API responsibility small; worker evolves independently (retries, batching, multi-template) without API release"
  ],
  "alternatives_rejected": [
    {"option": "synchronous send from API", "reason": "SES p99 well above signup-latency budget"},
    {"option": "job-status callback to API", "reason": "no consumer for v1; only matters when retries land"},
    {"option": "outbox pattern", "reason": "overkill until we have a transactional concern"}
  ],
  "consequences": [
    "Worker is source of truth for \"did the email send\"",
    "Worker outage stalls pipeline silently from API's view — operator alerting on queue depth + SES errors is the signal"
  ]
}
```

For artefact 1 (md+YAML baseline), the model must derive `rule`, `why`, `alternatives_rejected`, `consequences` from the prose body — these are NOT in frontmatter. Most demanding extraction in the suite.

### Batch 6 — `orchestrator/` (expect 3 elements, identical content)

```json
{
  "type": "orchestrator-snapshot",
  "author": "orchestrator",
  "at": "2026-01-10T10:35:00Z",
  "status": "done",
  "summary": "Welcome-emails v1 is shipped — API enqueues on signup, worker sends via SES, staging verified, no open questions.",
  "headline": "v1 end-to-end shipped: signup enqueues a welcome-email job, worker dequeues and sends through SES, staging green, no open cross-repo asks.",
  "where_each_repo_stands": {
    "api": "POST /signup enqueuing on welcome-emails against welcome-email-job v1.0.0; tests green; staging verified; done for v1",
    "worker": "consumer wired with payload validation and English-template fall-through for non-en locales; staging end-to-end green; done for v1"
  },
  "shipped_since_last": [
    {"what": "API enqueue path live on staging", "ref": "log/2026-01-10T09-30-00-api-shipped.md"},
    {"what": "Worker consumer + SES send + staging verification", "ref": "log/2026-01-10T10-15-00-worker-ack.md"},
    {"what": "ADR pinning fire-and-forget semantics", "ref": "decisions/2026-01-10T09-00-00-fire-and-forget-semantics.md"},
    {"what": "Wire contract published", "ref": "contracts/welcome-email-job/2026-01-10T09-00-00-api-v1.0.0.md"}
  ],
  "decisions_made": ["Fire-and-forget for v1 — API isn't told about send outcomes; queue is the contract boundary"],
  "open_for_human": [],
  "next_up": {
    "api": "nothing for v1; pick up v2 retry semantics when scoped",
    "worker": "nothing for v1; same",
    "joint": "production deploy of both services in either order — fire-and-forget means no required sequencing"
  }
}
```

---

## Results table

Fill in PASS / PARTIAL / FAIL per cell. One full sweep per tier.

### Haiku 4.5

Run date: 2026-05-18. Single session, all 6 batches read sequentially. Raw output: `raw-haiku-4-5.md`.

| Artefact (variant)              | Result | Notes (which field failed, if any) |
|---------------------------------|--------|-------------------------------------|
| log / md+YAML (api-shipped)     | ✅     |                                     |
| log / md+YAML (worker-ack)      | ✅     |                                     |
| log / TOML (api-shipped)        | ✅     |                                     |
| log / TOML (worker-ack)         | ✅     |                                     |
| log / JSONL element 1           | ✅     |                                     |
| log / JSONL element 2           | ✅     |                                     |
| digest / md+YAML                | ✅     | `per_repo` / `shipped_since_bootstrap` / `where_to_look` derived from prose body. |
| digest / denser-md              | ✅     |                                     |
| digest / TOML                   | ✅     | Preserved TOML's nested `{state, notes, blocked}` per_repo objects rather than collapsing to map-of-strings — faithful read, not a hallucination. |
| repos / md+YAML (api)           | ✅     | First-element omits `role`/`consumer` from contracts_in_play; later elements include them. Stylistic only, all required fields present. |
| repos / md+YAML (worker)        | ✅     |                                     |
| repos / yaml-only (api)         | ✅     |                                     |
| repos / yaml-only (worker)      | ✅     |                                     |
| repos / TOML (api)              | ✅     |                                     |
| repos / TOML (worker)           | ✅     |                                     |
| contracts / md+YAML             | ✅     | Payload markdown table lifted to `payload_fields` map. |
| contracts / TOML                | ✅     |                                     |
| contracts / JSON Schema         | ✅     | `x-meta` / `x-queue` / `x-expectations` lifted; `required[]` + `properties.*.description` merged into `payload_fields`. |
| decisions / md+YAML             | ✅     | `rule` / `why` / `alternatives_rejected` / `consequences` all derived from prose sections. |
| decisions / denser-md           | ✅     |                                     |
| decisions / TOML                | ✅     |                                     |
| orchestrator / md+YAML          | ✅     | `headline` / `where_each_repo_stands` / etc. all derived from prose body. |
| orchestrator / denser-md        | ✅     |                                     |
| orchestrator / hybrid           | ✅     | Preserved nested `{state, note}` per-repo objects (same stylistic faithfulness as the digest TOML variant). |

### Opus 4.7

Run date: 2026-05-18. Single session, all 6 batches read sequentially in one pass (realistic 1M-context usage; no /clear between batches). Raw output: `raw-opus-4-7.md`.

| Artefact (variant)              | Result | Notes (which field failed, if any) |
|---------------------------------|--------|-------------------------------------|
| log / md+YAML (api-shipped)     | ✅     |                                     |
| log / md+YAML (worker-ack)      | ✅     |                                     |
| log / TOML (api-shipped)        | ✅     |                                     |
| log / TOML (worker-ack)         | ✅     |                                     |
| log / JSONL element 1           | ✅     |                                     |
| log / JSONL element 2           | ✅     |                                     |
| digest / md+YAML                | ✅     | `per_repo` / `shipped_since_bootstrap` / `where_to_look` derived from prose body. |
| digest / denser-md              | ✅     |                                     |
| digest / TOML                   | ✅     | Nested `per_repo.{state,notes,blocked}` flattened to canonical map-of-strings. |
| repos / md+YAML (api)           | ✅     | `current_goal` derived from "## Current goal" section. |
| repos / md+YAML (worker)        | ✅     | `current_goal` derived from "## Current goal" section. |
| repos / yaml-only (api)         | ✅     |                                     |
| repos / yaml-only (worker)      | ✅     |                                     |
| repos / TOML (api)              | ✅     |                                     |
| repos / TOML (worker)           | ✅     |                                     |
| contracts / md+YAML             | ✅     | Payload markdown table lifted to `payload_fields` map. |
| contracts / TOML                | ✅     |                                     |
| contracts / JSON Schema         | ✅     | `x-meta` / `x-queue` / `x-expectations` lifted; `required[]` + `properties.*.description` merged into `payload_fields`. |
| decisions / md+YAML             | ✅     | `rule` / `why` / `alternatives_rejected` / `consequences` all derived from prose sections — most demanding row. |
| decisions / denser-md           | ✅     |                                     |
| decisions / TOML                | ✅     |                                     |
| orchestrator / md+YAML          | ✅     | `headline` / `where_each_repo_stands` / `shipped_since_last` / `decisions_made` / `open_for_human` / `next_up` all derived from prose. |
| orchestrator / denser-md        | ✅     |                                     |
| orchestrator / hybrid           | ✅     | `where_each_repo_stands` collapsed from `{state,note}` objects to canonical strings; prose-body sections merged with frontmatter. |

### Sonnet 4.6

| Artefact (variant)              | Result | Notes (which field failed, if any) |
|---------------------------------|--------|-------------------------------------|
| log / md+YAML (api-shipped)     | ✅     |                                     |
| log / md+YAML (worker-ack)      | ✅     |                                     |
| log / TOML (api-shipped)        | ✅     |                                     |
| log / TOML (worker-ack)         | ✅     |                                     |
| log / JSONL element 1           | ✅     |                                     |
| log / JSONL element 2           | ✅     |                                     |
| digest / md+YAML                | ✅     |                                     |
| digest / denser-md              | ✅     |                                     |
| digest / TOML                   | ✅     |                                     |
| repos / md+YAML (api)           | ✅     |                                     |
| repos / md+YAML (worker)        | ✅     |                                     |
| repos / yaml-only (api)         | ✅     |                                     |
| repos / yaml-only (worker)      | ✅     |                                     |
| repos / TOML (api)              | ✅     |                                     |
| repos / TOML (worker)           | ✅     |                                     |
| contracts / md+YAML             | ✅     |                                     |
| contracts / TOML                | ✅     |                                     |
| contracts / JSON Schema         | ✅     |                                     |
| decisions / md+YAML             | ✅     |                                     |
| decisions / denser-md           | ✅     |                                     |
| decisions / TOML                | ✅     |                                     |
| orchestrator / md+YAML          | ✅     |                                     |
| orchestrator / denser-md        | ✅     |                                     |
| orchestrator / hybrid           | ✅     |                                     |

## After both sweeps

Hand the filled table back; I'll fold the results into the ADR's per-artefact table and flip the status to `accepted` (or to `proposed → revise` if a winning format flunks parse-reliability badly enough to disqualify it).
