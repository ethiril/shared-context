# Format A/B — token-cost comparison

Token backend: **tiktoken cl100k_base**

## `log/`

| variant | files | chars | words | tokens | Δ chars | Δ words | Δ tokens |
|---|---|---|---|---|---|---|---|
| md-yaml | 2 | 1437 | 189 | 437 | — | — | — |
| toml | 2 | 1501 | 207 | 454 | +4.5% | +9.5% | +3.9% |
| jsonl | 1 | 1460 | 145 | 416 | +1.6% | -23.3% | -4.8% |

## `digest/`

| variant | files | chars | words | tokens | Δ chars | Δ words | Δ tokens |
|---|---|---|---|---|---|---|---|
| md-yaml | 1 | 1249 | 142 | 382 | — | — | — |
| denser-md | 1 | 982 | 85 | 309 | -21.4% | -40.1% | -19.1% |
| toml | 1 | 1171 | 117 | 358 | -6.2% | -17.6% | -6.3% |

## `repos/`

| variant | files | chars | words | tokens | Δ chars | Δ words | Δ tokens |
|---|---|---|---|---|---|---|---|
| md-yaml | 2 | 1452 | 214 | 413 | — | — | — |
| yaml-only | 2 | 1349 | 187 | 388 | -7.1% | -12.6% | -6.1% |
| toml | 2 | 1406 | 203 | 397 | -3.2% | -5.1% | -3.9% |

## `contracts/`

| variant | files | chars | words | tokens | Δ chars | Δ words | Δ tokens |
|---|---|---|---|---|---|---|---|
| md-yaml | 1 | 1137 | 159 | 305 | — | — | — |
| toml | 1 | 1015 | 159 | 287 | -10.7% | +0.0% | -5.9% |
| json-schema | 1 | 1488 | 155 | 447 | +30.9% | -2.5% | +46.6% |

## `decisions/`

| variant | files | chars | words | tokens | Δ chars | Δ words | Δ tokens |
|---|---|---|---|---|---|---|---|
| md-yaml | 1 | 1386 | 220 | 316 | — | — | — |
| denser-md | 1 | 1228 | 183 | 286 | -11.4% | -16.8% | -9.5% |
| toml | 1 | 1317 | 195 | 304 | -5.0% | -11.4% | -3.8% |

## `orchestrator/`

| variant | files | chars | words | tokens | Δ chars | Δ words | Δ tokens |
|---|---|---|---|---|---|---|---|
| md-yaml | 1 | 1795 | 242 | 489 | — | — | — |
| denser-md | 1 | 1540 | 182 | 438 | -14.2% | -24.8% | -10.4% |
| hybrid | 1 | 1701 | 215 | 464 | -5.2% | -11.2% | -5.1% |

## Catch-up read-set (aggregate)

Read set = 1 orchestrator snapshot + N log entries + 1 contract. Per-format aggregate is the sum of those artefacts when rendered in that variant.

| combo | chars | words | tokens | Δ chars | Δ words | Δ tokens |
|---|---|---|---|---|---|---|
| all-md-yaml (baseline) | 4369 | 590 | 1231 | +0.0% | +0.0% | +0.0% |
| log=jsonl, rest=md-yaml | 4392 | 546 | 1210 | +0.5% | -7.5% | -1.7% |
| log=toml, rest=md-yaml | 4433 | 608 | 1248 | +1.5% | +3.1% | +1.4% |
| orch=denser-md, log=jsonl, ct=toml | 4015 | 486 | 1141 | -8.1% | -17.6% | -7.3% |
| orch=hybrid, log=jsonl, ct=toml | 4176 | 519 | 1167 | -4.4% | -12.0% | -5.2% |
| orch=denser-md, log=jsonl, ct=json-schema | 4488 | 482 | 1301 | +2.7% | -18.3% | +5.7% |

