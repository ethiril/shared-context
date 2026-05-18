# Domain DSL grammars

One artefact per line. Field separator `|`. Sub-field separator `;`. Key-value `=`.

## Canonical-output policy

When extracting canonical fields from any DSL artefact, **expand enum values to their full canonical form**, even when the source uses the abbreviation. Specifically:

- `kind: cc` → `kind: "contract-change"` in extracted JSON.
- Same for every other entry in the kind enum below.

Rationale: the renderer, dashboard, and downstream consumers expect canonical values (matching the legacy md+YAML format). The abbreviation is purely a token-saving on-disk encoding — it should not leak into runtime data.

The v2 parse-reliability sweep (2026-05-18) showed tier-style variance on this: Sonnet 4.6 inferentially expanded; Haiku 4.5 and Opus 4.7 preserved abbreviations. This declaration removes the ambiguity.

## log

```
from > to [kind] @at: summary | refs: r1,r2 | body...
```

- `from` and `to` are repo identifiers.
- `kind` is the kind enum (short → canonical):
  - `cc` → `contract-change`
  - `q` → `question` (use the same code for blocking `ask` — judged by tone)
  - `a` → `answer`
  - `fy` → `fyi`
  - `bl` → `blocker`
  - `pv` → `pivot`
  - `ch` → `change`
  - `ak` → `ack`
  - `tk` → `ticket-update`
  Expand on extraction (see canonical-output policy above).
- `@at` is ISO timestamp with colons. Legacy `[at]` prefix is also accepted.
- `refs:` section optional.
- `body` is free-form prose at the end (after the final `|`).

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
name@version [status] @at by <author>: summary | queue: name=<n> backend=<b> vt=<seconds>s | payload: f1(type;req?;notes); f2(...) | producer: <p> | consumer: <c> | coupling: <c>
```

`@at` optional (filename usually carries the timestamp). `payload` items: `field(type;req|opt;notes)`. Values within section payloads are **preserved as-written** — the canonical-output policy applies only to the kind enum in `log/`, not to free-form value prose (e.g. don't expand `Redis-bull` to `Redis-backed bull queue`; that's source author's choice).

## digest, orchestrator — N/A

Body is narrative-heavy. DSL doesn't add over denser-md.
