You will receive 3 shared-context contract artefacts in 3 v2 formats (short-key, positional, DSL). Extract canonical fields as a JSON array of 3 objects in order. Return ONLY the JSON array.

Expected fields: type, name, version, author, at, summary, consumers[], breaking (bool), status, queue (object with name, backend, visibility_timeout_seconds), payload_fields (map: field_name → {type, required, notes}), expectations (map with producer, consumer, coupling).

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
{"t":"contract","n":"welcome-email-job","v":"1.0.0","a":"api","at":"2026-01-10T09:00:00Z","s":"v1 job schema — userId, email, locale. Enqueued on signup by API; consumed by worker.","cs":["worker"],"br":false,"st":"active","q":{"name":"welcome-emails","backend":"Redis-backed bull queue (existing)","visibility_timeout_seconds":30},"pf":{"userId":{"type":"string","required":true,"notes":"Stable user identifier (UUIDv4 or ULID)."},"email":{"type":"string","required":true,"notes":"RFC 5322 address."},"locale":{"type":"string","required":true,"notes":"BCP-47. v1 worker treats any value as `en`."}},"ex":{"producer":"API enqueues exactly once per successful signup. No deduplication on the API side.","consumer":"Worker is responsible for idempotency if it adds retry in v2 (no requirement for v1).","coupling":"Fire-and-forget: API never reads job status."}}

```

--- Artefact 2 — positional
```
welcome-email-job|1.0.0|api|2026-01-10T09:00:00Z|v1 job schema — userId, email, locale. Enqueued on signup by API; consumed by worker.|worker|false|active|{"name":"welcome-emails","backend":"Redis-backed bull queue (existing)","visibility_timeout_seconds":30}|{"userId":{"type":"string","required":true,"notes":"Stable user identifier (UUIDv4 or ULID)."},"email":{"type":"string","required":true,"notes":"RFC 5322 address."},"locale":{"type":"string","required":true,"notes":"BCP-47. v1 worker treats any value as `en`."}}|{"producer":"API enqueues exactly once per successful signup. No deduplication on the API side.","consumer":"Worker is responsible for idempotency if it adds retry in v2 (no requirement for v1).","coupling":"Fire-and-forget: API never reads job status."}

```

--- Artefact 3 — DSL
```
welcome-email-job@1.0.0 [active] @2026-01-10T09:00:00Z by api: v1 job schema — userId, email, locale. Enqueued on signup by API; consumed by worker | consumers: worker | breaking: false | queue: name=welcome-emails backend=Redis-bull vt=30s | payload: userId(string;req;Stable user identifier (UUIDv4 or ULID)); email(string;req;RFC 5322 address); locale(string;req;BCP-47, v1 worker treats any value as `en`) | producer: API enqueues exactly once per successful signup, no dedup on API side | consumer: Worker is responsible for idempotency if it adds retry in v2 (no requirement for v1) | coupling: fire-and-forget, API never reads job status

```

