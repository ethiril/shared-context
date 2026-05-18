# Format A/B v2 — token-cost comparison

Token backend: **tiktoken cl100k_base**
Legend amortisation mode: **amortised-10sessions** (divisor = 50)

Per-row deltas show v2 candidate vs (a) md+YAML baseline and (b) v1 winner. Amortised columns include `legend_tokens / divisor` added to the candidate's per-artefact token count.

## `log/`

Baselines: md+YAML = 437 tokens; v1 winner (jsonl) = 416 tokens.

| variant | tokens (raw) | + legend amortised | Δ vs md+YAML | Δ vs v1 winner |
|---|---|---|---|---|
| short-key | 415 | 421 (+6) | -3.7% | +1.2% |
| positional | 375 | 380 (+5) | -13.0% | -8.7% |
| dsl | 288 | 296 (+8) | -32.3% | -28.8% |

## `digest/`

Baselines: md+YAML = 382 tokens; v1 winner (denser-md) = 309 tokens.

| variant | tokens (raw) | + legend amortised | Δ vs md+YAML | Δ vs v1 winner |
|---|---|---|---|---|
| short-key | 277 | 283 (+6) | -25.9% | -8.4% |
| positional | N/A | N/A | N/A | N/A |
| dsl | N/A | N/A | N/A | N/A |

## `repos/`

Baselines: md+YAML = 413 tokens; v1 winner (yaml-only) = 388 tokens.

| variant | tokens (raw) | + legend amortised | Δ vs md+YAML | Δ vs v1 winner |
|---|---|---|---|---|
| short-key | 322 | 328 (+6) | -20.6% | -15.5% |
| positional | 276 | 281 (+5) | -32.0% | -27.6% |
| dsl | 263 | 271 (+8) | -34.4% | -30.2% |

## `contracts/`

Baselines: md+YAML = 305 tokens; v1 winner (toml) = 287 tokens.

| variant | tokens (raw) | + legend amortised | Δ vs md+YAML | Δ vs v1 winner |
|---|---|---|---|---|
| short-key | 236 | 242 (+6) | -20.7% | -15.7% |
| positional | 212 | 217 (+5) | -28.9% | -24.4% |
| dsl | 183 | 191 (+8) | -37.4% | -33.4% |

## `decisions/`

Baselines: md+YAML = 316 tokens; v1 winner (denser-md) = 286 tokens.

| variant | tokens (raw) | + legend amortised | Δ vs md+YAML | Δ vs v1 winner |
|---|---|---|---|---|
| short-key | 261 | 267 (+6) | -15.5% | -6.6% |
| positional | 237 | 242 (+5) | -23.4% | -15.4% |
| dsl | 213 | 221 (+8) | -30.1% | -22.7% |

## `orchestrator/`

Baselines: md+YAML = 489 tokens; v1 winner (denser-md) = 438 tokens.

| variant | tokens (raw) | + legend amortised | Δ vs md+YAML | Δ vs v1 winner |
|---|---|---|---|---|
| short-key | 376 | 382 (+6) | -21.9% | -12.8% |
| positional | N/A | N/A | N/A | N/A |
| dsl | N/A | N/A | N/A | N/A |

## Catch-up read-set aggregates

Read set = 1 orchestrator + 2 logs + 1 contract. Each combo picks one variant per type.

| combo | tokens (eff) | Δ vs md+YAML | Δ vs v1 winners |
|---|---|---|---|
| md+YAML baseline | 1231 | +0.0% | +7.9% |
| v1 winners (denser-md + jsonl + toml) | 1141 | -7.3% | +0.0% |
| v2: short-key everywhere | 1045 | -15.1% | -8.4% |
| v2: orch=v1, log=short-key, ct=v1 | 1146 | -6.9% | +0.4% |
| v2: orch=v1, log=positional, ct=v1 | 1105 | -10.2% | -3.2% |
| v2: orch=v1, log=dsl, ct=v1 | 1021 | -17.1% | -10.5% |
| v2: orch=v1, log=positional, ct=dsl | 1009 | -18.0% | -11.6% |
| v2: orch=v1, log=dsl, ct=dsl | 925 | -24.9% | -18.9% |

