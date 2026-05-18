You will receive 5 shared-context log artefacts in 3 new on-disk formats: short-key JSONL (2 events in one file), positional records (2 events), and a domain DSL (2 events). Each format has a legend that defines its key map / schema / grammar; the legend is shared across all artefacts in that format. Extract canonical fields as a JSON array of 6 objects in the order the artefacts appear (short-key JSONL yields 2 elements at its position; positional yields 2; DSL yields 2). Return ONLY the JSON array, no prose.

Expected fields per object: type, kind, from, at, to[], summary, refs[] (may be empty), body.

Kind enum (used in DSL): cc=contract-change, q=question, a=answer, fy=fyi, bl=blocker, pv=pivot, ch=change, ak=ack, tk=ticket-update.

--- LEGEND (short-key)
```
{
  "t": "type", "k": "kind", "f": "from", "a": "author",
  "at": "at", "to": "to", "s": "summary", "r": "refs", "b": "body",
  "ti": "title", "st": "status", "af": "affects",
  "ru": "rule", "w": "why", "ar": "alternatives_rejected", "co": "consequences",
  "n": "name", "v": "version", "cs": "consumers", "br": "breaking",
  "q": "queue", "pf": "payload_fields", "ex": "expectations",
  "rp": "repo", "g": "current_goal", "d": "done", "nx": "next", "bk": "blocked_on",
  "c": "contracts_in_play", "oq": "open_questions",
  "pr": "per_repo", "ca": "contracts_active", "dl": "decisions_live",
  "oc": "open_cross_repo", "sb": "shipped_since_bootstrap", "wl": "where_to_look",
  "h": "headline", "wrs": "where_each_repo_stands",
  "ssl": "shipped_since_last", "dm": "decisions_made",
  "ofh": "open_for_human", "nu": "next_up"
}

```

--- LEGEND (positional)
```
# Positional record schemas

Field separator: `|`. Multi-value (inside a field): `~`. Embedded `|` in a value: `\|`.

Type is implicit from the source directory; not in the schema.

## log

```
kind|from|at|to|summary|refs|body
```

`to` and `refs` are `~`-separated lists.

## repos

```
repo|at|summary|current_goal|done|next|blocked_on|contracts_in_play|open_questions
```

`done`, `next`, `blocked_on` are `~`-separated lists. `contracts_in_play` and `open_questions` are inline JSON.

## decisions

```
title|author|at|summary|status|affects|rule|why|alternatives_rejected|consequences
```

`affects`, `why`, `consequences` are `~`-separated. `alternatives_rejected` is inline JSON.

## contracts

```
name|version|author|at|summary|consumers|breaking|status|queue|payload_fields|expectations
```

`consumers` is `~`-separated. `queue`, `payload_fields`, `expectations` are inline JSON.

```

--- LEGEND (DSL)
```
# Domain DSL grammars

One artefact per line. Field separator `|`. Sub-field separator `;`. Key-value `=`.

## log

```
from > to [kind]: summary | refs: r1,r2 | body...
```

- `from` and `to` are repo identifiers.
- `kind` is the kind enum (`cc`=contract-change, `q`=question, `a`=answer, `fy`=fyi, `bl`=blocker, `pv`=pivot, `ch`=change, `ak`=ack, `tk`=ticket-update).
- `refs:` section optional.
- `body` is free-form prose at the end.

## repos (status)

```
repo: summary | goal: <current_goal> | done: d1; d2; d3 | next: n1; n2 | blocked: ... | contracts: c1@v(role[; consumer=...]); c2@v | asks: <to>?<ask>
```

Sections after the first colon use `|` separator. `done`/`next` items separated by `;`. `contracts` use `name@version(role)` shorthand.

## decisions (ADR)

```
title [status] affects:<scope> | rule: <rule> | why: w1; w2 | rejected: opt1=>reason1; opt2=>reason2 | consequences: c1; c2
```

## contracts

```
name@version [status] by <author>: summary | queue: name=<n> backend=<b> vt=<seconds>s | payload: f1(type;req?;notes); f2(...) | producer: <p> | consumer: <c> | coupling: <c>
```

`payload` items: `field(type;req|opt;notes)`.

## digest, orchestrator — N/A

Body is narrative-heavy. DSL doesn't add over denser-md.

```

--- Artefact set 1 — short-key JSONL (2 events)
```
{"t":"log","k":"cc","f":"api","at":"2026-01-10T09:30:00Z","to":["worker"],"s":"POST /signup now enqueues welcome-email jobs against welcome-email-job v1.0.0.","r":["contracts/welcome-email-job/2026-01-10T09-00-00-api-v1.0.0.md","decisions/2026-01-10T09-00-00-fire-and-forget-semantics.md"],"b":"POST /signup enqueues a welcome-email job after the user row commits. Payload shape per welcome-email-job v1.0.0. Fire-and-forget — no retry, no callback. See the ADR for why.\n\n@worker: please confirm you can dequeue against this shape and that locales other than `en` are tolerated as no-ops for v1. Reply via a kind:answer log entry referencing this file."}
{"t":"log","k":"a","f":"worker","at":"2026-01-10T10:15:00Z","to":["api"],"s":"Consumer wired against v1.0.0; non-`en` locales fall through to English with a debug log line.","r":["log/2026-01-10T09-30-00-api-shipped.md","contracts/welcome-email-job/2026-01-10T09-00-00-api-v1.0.0.md"],"b":"Consumer for the welcome-emails queue is wired. Payload validated against v1.0.0; rejects on missing userId/email (drops to dead-letter), tolerates any locale value (anything other than `en` triggers a debug log line and uses the English template).\n\nSanity-checked end-to-end against a staging signup: job dequeued, SES send returned 200, log line as expected.\n\nNo follow-up needed from api for v1. Will pick up retry semantics when we get to v2."}

```

--- Artefact set 2 — positional (2 events)
```
cc|api|2026-01-10T09:30:00Z|worker|POST /signup now enqueues welcome-email jobs against welcome-email-job v1.0.0.|contracts/welcome-email-job/2026-01-10T09-00-00-api-v1.0.0.md~decisions/2026-01-10T09-00-00-fire-and-forget-semantics.md|POST /signup enqueues a welcome-email job after the user row commits. Payload shape per welcome-email-job v1.0.0. Fire-and-forget — no retry, no callback. See the ADR for why.\n\n@worker: please confirm you can dequeue against this shape and that locales other than `en` are tolerated as no-ops for v1. Reply via a kind:answer log entry referencing this file.
a|worker|2026-01-10T10:15:00Z|api|Consumer wired against v1.0.0; non-`en` locales fall through to English with a debug log line.|log/2026-01-10T09-30-00-api-shipped.md~contracts/welcome-email-job/2026-01-10T09-00-00-api-v1.0.0.md|Consumer for the welcome-emails queue is wired. Payload validated against v1.0.0; rejects on missing userId/email (drops to dead-letter), tolerates any locale value (anything other than `en` triggers a debug log line and uses the English template).\n\nSanity-checked end-to-end against a staging signup: job dequeued, SES send returned 200, log line as expected.\n\nNo follow-up needed from api for v1. Will pick up retry semantics when we get to v2.

```

--- Artefact set 3 — DSL (2 events)
```
api > worker [cc] @2026-01-10T09:30:00Z: POST /signup now enqueues welcome-email-job v1.0.0 | refs: contracts/welcome-email-job/2026-01-10T09-00-00-api-v1.0.0.md, decisions/2026-01-10T09-00-00-fire-and-forget-semantics.md | POST /signup enqueues a welcome-email job after the user row commits. Fire-and-forget — no retry, no callback. @worker: please confirm dequeue and that locales other than `en` are tolerated as no-ops for v1.
worker > api [a] @2026-01-10T10:15:00Z: Consumer wired against v1.0.0; non-`en` locales fall through to English | refs: log/2026-01-10T09-30-00-api-shipped.md, contracts/welcome-email-job/2026-01-10T09-00-00-api-v1.0.0.md | Consumer for welcome-emails wired. Payload validated against v1.0.0; rejects on missing userId/email (drops to DLQ), tolerates any locale value. Sanity-checked staging signup: job dequeued, SES send returned 200. No follow-up needed for v1; v2 retries later.

```

