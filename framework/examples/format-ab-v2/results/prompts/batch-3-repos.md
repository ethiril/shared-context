You will receive 6 shared-context repo-status artefacts. They cover 2 repos (api, worker) × 3 v2 formats (short-key, positional, DSL). Extract canonical fields as a JSON array of 6 objects in order. Return ONLY the JSON array.

Expected fields: type, repo, at, summary, current_goal, done[], next[], blocked_on[], contracts_in_play[] (objects with at least name + version), open_questions[].

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

--- Artefact 1 — short-key (api)
```
{"t":"status","rp":"api","at":"2026-01-10T09:30:00Z","s":"v1 enqueue shipped on main; awaiting worker ack and joint staging verification.","g":"Enqueue a welcome-email job on every successful signup.","d":["POST /signup enqueues against welcome-email-job v1.0.0","ADR for fire-and-forget semantics published","Unit + integration tests green"],"nx":["Joint staging signup test once worker confirms it's consuming","Nothing else on the API side for v1"],"bk":[],"c":[{"n":"welcome-email-job","v":"1.0.0","role":"owner","consumer":"worker"}],"oq":[{"to":"worker","ask":"confirm consumer is wired and non-`en` locales fall through cleanly"}]}

```

--- Artefact 2 — short-key (worker)
```
{"t":"status","rp":"worker","at":"2026-01-10T10:15:00Z","s":"Consumer wired against v1.0.0 and verified end-to-end on staging.","g":"Consume welcome-emails and send via SES.","d":["Consumer for the welcome-emails queue","Payload validation against welcome-email-job v1.0.0; bad-shape jobs go to DLQ","Non-`en` locales fall through to English with a debug log","End-to-end staging test green"],"nx":["v2 retry policy when we get to it; no work pending for v1"],"bk":[],"c":[{"n":"welcome-email-job","v":"1.0.0","role":"consumer"}],"oq":[]}

```

--- Artefact 3 — positional (api)
```
api|2026-01-10T09:30:00Z|v1 enqueue shipped on main; awaiting worker ack and joint staging verification.|Enqueue a welcome-email job on every successful signup.|POST /signup enqueues against welcome-email-job v1.0.0~ADR for fire-and-forget semantics published~Unit + integration tests green|Joint staging signup test once worker confirms it's consuming~Nothing else on the API side for v1||[{"name":"welcome-email-job","version":"1.0.0","role":"owner","consumer":"worker"}]|[{"to":"worker","ask":"confirm consumer is wired and non-`en` locales fall through cleanly"}]

```

--- Artefact 4 — positional (worker)
```
worker|2026-01-10T10:15:00Z|Consumer wired against v1.0.0 and verified end-to-end on staging.|Consume welcome-emails and send via SES.|Consumer for the welcome-emails queue~Payload validation against welcome-email-job v1.0.0; bad-shape jobs go to DLQ~Non-`en` locales fall through to English with a debug log~End-to-end staging test green|v2 retry policy when we get to it; no work pending for v1||[{"name":"welcome-email-job","version":"1.0.0","role":"consumer"}]|[]

```

--- Artefact 5 — DSL (api)
```
api @2026-01-10T09:30:00Z: v1 enqueue shipped on main; awaiting worker ack and joint staging verification | goal: Enqueue a welcome-email job on every successful signup | done: POST /signup enqueues against welcome-email-job v1.0.0; ADR for fire-and-forget published; unit + integration tests green | next: joint staging signup test once worker confirms consuming; nothing else for v1 | blocked: — | contracts: welcome-email-job@1.0.0(owner; consumer=worker) | asks: worker?confirm consumer wired & non-`en` locales fall through cleanly

```

--- Artefact 6 — DSL (worker)
```
worker @2026-01-10T10:15:00Z: Consumer wired against v1.0.0 and verified end-to-end on staging | goal: Consume welcome-emails and send via SES | done: consumer for welcome-emails queue; payload validation against v1.0.0 with bad-shape→DLQ; non-`en` locales fall through to English with debug log; end-to-end staging green | next: v2 retry policy when scoped; nothing pending for v1 | blocked: — | contracts: welcome-email-job@1.0.0(consumer) | asks: —

```

