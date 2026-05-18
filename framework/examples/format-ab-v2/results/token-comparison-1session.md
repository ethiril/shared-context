# Format A/B v2 — token-cost comparison

Token backend: **tiktoken cl100k_base**
Legend amortisation mode: **amortised-1session** (divisor = 5)

Per-row deltas show v2 candidate vs (a) md+YAML baseline and (b) v1 winner. Amortised columns include `legend_tokens / divisor` added to the candidate's per-artefact token count.

## `log/`

Baselines: md+YAML = 437 tokens; v1 winner (jsonl) = 416 tokens.

| variant | tokens (raw) | + legend amortised | Δ vs md+YAML | Δ vs v1 winner |
|---|---|---|---|---|
| short-key | 415 | 476 (+61) | +8.9% | +14.4% |
| positional | 375 | 428 (+53) | -2.1% | +2.9% |
| dsl | 288 | 368 (+80) | -15.8% | -11.5% |

## `digest/`

Baselines: md+YAML = 382 tokens; v1 winner (denser-md) = 309 tokens.

| variant | tokens (raw) | + legend amortised | Δ vs md+YAML | Δ vs v1 winner |
|---|---|---|---|---|
| short-key | 277 | 338 (+61) | -11.5% | +9.4% |
| positional | N/A | N/A | N/A | N/A |
| dsl | N/A | N/A | N/A | N/A |

## `repos/`

Baselines: md+YAML = 413 tokens; v1 winner (yaml-only) = 388 tokens.

| variant | tokens (raw) | + legend amortised | Δ vs md+YAML | Δ vs v1 winner |
|---|---|---|---|---|
| short-key | 322 | 383 (+61) | -7.3% | -1.3% |
| positional | 276 | 329 (+53) | -20.3% | -15.2% |
| dsl | 263 | 343 (+80) | -16.9% | -11.6% |

## `contracts/`

Baselines: md+YAML = 305 tokens; v1 winner (toml) = 287 tokens.

| variant | tokens (raw) | + legend amortised | Δ vs md+YAML | Δ vs v1 winner |
|---|---|---|---|---|
| short-key | 236 | 297 (+61) | -2.6% | +3.5% |
| positional | 212 | 265 (+53) | -13.1% | -7.7% |
| dsl | 183 | 263 (+80) | -13.8% | -8.4% |

## `decisions/`

Baselines: md+YAML = 316 tokens; v1 winner (denser-md) = 286 tokens.

| variant | tokens (raw) | + legend amortised | Δ vs md+YAML | Δ vs v1 winner |
|---|---|---|---|---|
| short-key | 261 | 322 (+61) | +1.9% | +12.6% |
| positional | 237 | 290 (+53) | -8.2% | +1.4% |
| dsl | 213 | 293 (+80) | -7.3% | +2.4% |

## `orchestrator/`

Baselines: md+YAML = 489 tokens; v1 winner (denser-md) = 438 tokens.

| variant | tokens (raw) | + legend amortised | Δ vs md+YAML | Δ vs v1 winner |
|---|---|---|---|---|
| short-key | 376 | 437 (+61) | -10.6% | -0.2% |
| positional | N/A | N/A | N/A | N/A |
| dsl | N/A | N/A | N/A | N/A |

## Catch-up read-set aggregates

Read set = 1 orchestrator + 2 logs + 1 contract. Each combo picks one variant per type.

| combo | tokens (eff) | Δ vs md+YAML | Δ vs v1 winners |
|---|---|---|---|
| md+YAML baseline | 1231 | +0.0% | +7.9% |
| v1 winners (denser-md + jsonl + toml) | 1141 | -7.3% | +0.0% |
| v2: short-key everywhere | 1211 | -1.6% | +6.1% |
| v2: orch=v1, log=short-key, ct=v1 | 1201 | -2.4% | +5.3% |
| v2: orch=v1, log=positional, ct=v1 | 1153 | -6.3% | +1.1% |
| v2: orch=v1, log=dsl, ct=v1 | 1093 | -11.2% | -4.2% |
| v2: orch=v1, log=positional, ct=dsl | 1130 | -8.2% | -1.0% |
| v2: orch=v1, log=dsl, ct=dsl | 1070 | -13.1% | -6.2% |

