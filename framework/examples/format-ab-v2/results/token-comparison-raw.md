# Format A/B v2 — token-cost comparison

Token backend: **tiktoken cl100k_base**
Legend amortisation mode: **raw** (divisor = ∞ (raw))

Per-row deltas show v2 candidate vs (a) md+YAML baseline and (b) v1 winner. Amortised columns include `legend_tokens / divisor` added to the candidate's per-artefact token count.

## `log/`

Baselines: md+YAML = 437 tokens; v1 winner (jsonl) = 416 tokens.

| variant | tokens (raw) | + legend amortised | Δ vs md+YAML | Δ vs v1 winner |
|---|---|---|---|---|
| short-key | 415 | 415 (+0) | -5.0% | -0.2% |
| positional | 375 | 375 (+0) | -14.2% | -9.9% |
| dsl | 288 | 288 (+0) | -34.1% | -30.8% |

## `digest/`

Baselines: md+YAML = 382 tokens; v1 winner (denser-md) = 309 tokens.

| variant | tokens (raw) | + legend amortised | Δ vs md+YAML | Δ vs v1 winner |
|---|---|---|---|---|
| short-key | 277 | 277 (+0) | -27.5% | -10.4% |
| positional | N/A | N/A | N/A | N/A |
| dsl | N/A | N/A | N/A | N/A |

## `repos/`

Baselines: md+YAML = 413 tokens; v1 winner (yaml-only) = 388 tokens.

| variant | tokens (raw) | + legend amortised | Δ vs md+YAML | Δ vs v1 winner |
|---|---|---|---|---|
| short-key | 322 | 322 (+0) | -22.0% | -17.0% |
| positional | 276 | 276 (+0) | -33.2% | -28.9% |
| dsl | 263 | 263 (+0) | -36.3% | -32.2% |

## `contracts/`

Baselines: md+YAML = 305 tokens; v1 winner (toml) = 287 tokens.

| variant | tokens (raw) | + legend amortised | Δ vs md+YAML | Δ vs v1 winner |
|---|---|---|---|---|
| short-key | 236 | 236 (+0) | -22.6% | -17.8% |
| positional | 212 | 212 (+0) | -30.5% | -26.1% |
| dsl | 183 | 183 (+0) | -40.0% | -36.2% |

## `decisions/`

Baselines: md+YAML = 316 tokens; v1 winner (denser-md) = 286 tokens.

| variant | tokens (raw) | + legend amortised | Δ vs md+YAML | Δ vs v1 winner |
|---|---|---|---|---|
| short-key | 261 | 261 (+0) | -17.4% | -8.7% |
| positional | 237 | 237 (+0) | -25.0% | -17.1% |
| dsl | 213 | 213 (+0) | -32.6% | -25.5% |

## `orchestrator/`

Baselines: md+YAML = 489 tokens; v1 winner (denser-md) = 438 tokens.

| variant | tokens (raw) | + legend amortised | Δ vs md+YAML | Δ vs v1 winner |
|---|---|---|---|---|
| short-key | 376 | 376 (+0) | -23.1% | -14.2% |
| positional | N/A | N/A | N/A | N/A |
| dsl | N/A | N/A | N/A | N/A |

## Catch-up read-set aggregates

Read set = 1 orchestrator + 2 logs + 1 contract. Each combo picks one variant per type.

| combo | tokens (eff) | Δ vs md+YAML | Δ vs v1 winners |
|---|---|---|---|
| md+YAML baseline | 1231 | +0.0% | +7.9% |
| v1 winners (denser-md + jsonl + toml) | 1141 | -7.3% | +0.0% |
| v2: short-key everywhere | 1027 | -16.6% | -10.0% |
| v2: orch=v1, log=short-key, ct=v1 | 1140 | -7.4% | -0.1% |
| v2: orch=v1, log=positional, ct=v1 | 1100 | -10.6% | -3.6% |
| v2: orch=v1, log=dsl, ct=v1 | 1013 | -17.7% | -11.2% |
| v2: orch=v1, log=positional, ct=dsl | 996 | -19.1% | -12.7% |
| v2: orch=v1, log=dsl, ct=dsl | 909 | -26.2% | -20.3% |

