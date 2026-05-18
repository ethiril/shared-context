You will receive 3 shared-context decision (ADR) artefacts in 3 v2 formats (short-key, positional, DSL). Extract canonical fields as a JSON array of 3 objects in order. Return ONLY the JSON array.

Expected fields: type, title, author, at, summary, status, affects[], rule (string), why[], alternatives_rejected[] (objects with option + reason), consequences[].

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

--- Artefact 1 — short-key
```
{"t":"decision","ti":"Fire-and-forget enqueue semantics for v1","a":"api","at":"2026-01-10T09:00:00Z","s":"API does not learn about send success or failure in v1; the queue is the contract boundary.","st":"accepted","af":["welcome-email-job"],"ru":"API never reads job status; successful enqueue is the API's only contract obligation. Send failures are observable only via worker logs and SES dashboards.","w":["v1 has no retry policy — a failure wouldn't trigger any API-side behaviour anyway","Coupling signup latency to SES availability is a poor trade for telemetry already available from worker","Keeps API responsibility small; worker evolves independently (retries, batching, multi-template) without API release"],"ar":[{"option":"synchronous send from API","reason":"SES p99 well above signup-latency budget"},{"option":"job-status callback to API","reason":"no consumer for v1; only matters when retries land"},{"option":"outbox pattern","reason":"overkill until we have a transactional concern"}],"co":["Worker is source of truth for \"did the email send\"","Worker outage stalls pipeline silently from API's view — operator alerting on queue depth + SES errors is the signal"]}

```

--- Artefact 2 — positional
```
Fire-and-forget enqueue semantics for v1|api|2026-01-10T09:00:00Z|API does not learn about send success or failure in v1; the queue is the contract boundary.|accepted|welcome-email-job|API never reads job status; successful enqueue is the API's only contract obligation. Send failures are observable only via worker logs and SES dashboards.|v1 has no retry policy — a failure wouldn't trigger any API-side behaviour anyway~Coupling signup latency to SES availability is a poor trade for telemetry already available from worker~Keeps API responsibility small; worker evolves independently (retries, batching, multi-template) without API release|[{"option":"synchronous send from API","reason":"SES p99 well above signup-latency budget"},{"option":"job-status callback to API","reason":"no consumer for v1; only matters when retries land"},{"option":"outbox pattern","reason":"overkill until we have a transactional concern"}]|Worker is source of truth for "did the email send"~Worker outage stalls pipeline silently from API's view — operator alerting on queue depth + SES errors is the signal

```

--- Artefact 3 — DSL
```
Fire-and-forget enqueue semantics for v1 [accepted] @2026-01-10T09:00:00Z by api affects: welcome-email-job | summary: API does not learn about send success or failure in v1; the queue is the contract boundary | rule: API never reads job status; successful enqueue is the API's only contract obligation. Send failures are observable only via worker logs and SES dashboards | why: v1 has no retry policy — a failure wouldn't trigger any API-side behaviour; coupling signup latency to SES availability is a poor trade for telemetry already available from worker; keeps API responsibility small and lets worker evolve independently | rejected: synchronous send from API => SES p99 well above signup-latency budget; job-status callback to API => no consumer for v1; outbox pattern => overkill until we have a transactional concern | consequences: worker is source of truth for "did the email send"; worker outage stalls pipeline silently from API's view — operator alerting on queue depth + SES errors is the signal

```

