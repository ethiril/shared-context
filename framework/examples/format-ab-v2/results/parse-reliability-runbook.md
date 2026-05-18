# Parse-reliability runbook — v2

Runbook for the parse-reliability half of `agent-format-pass-v2`. Same flow as v1 — run once per model tier, record PASS/PARTIAL/FAIL in the table at the bottom. Token-cost data is already frozen in `token-comparison-1session.md` / `token-comparison-10sessions.md`.

The canonical reference content is **identical to v1** (same welcome-emails scenario) — diff Claude's output against the canonical refs in `framework/examples/format-ab/results/parse-reliability-runbook.md` (v1 runbook). The only difference is the on-disk encoding.

## Setup

1. Open Claude Code at `/Users/michaelstachowicz/MSN/shared-context`.
2. `/model` → pick the tier (Haiku 4.5, Sonnet 4.6, Opus 4.7 — run each in turn).
3. `/clear` between batches so legends don't leak between batches.

## One-paste orchestration (recommended)

Paste this once per tier:

```
Run the v2 parse-reliability A/B test for agent-format-pass-v2. For each of the 6 batch files listed below, in order:

1. Read the file with the Read tool. Each file contains a self-contained extraction prompt, including any legend files needed to parse the new formats (short-key JSONL, positional records, domain DSL).
2. Follow the file's instructions exactly: extract canonical fields as the JSON array (or object) it specifies.
3. Output your result in:

   ## Batch <N> — <artefact type> result
   ```json
   [ ...your JSON array here... ]
   ```

The files (under framework/examples/format-ab-v2/results/prompts/):
- batch-1-log.md          (6 elements expected: 2 short-key + 2 positional + 2 DSL)
- batch-2-digest.md       (1 element expected — short-key only)
- batch-3-repos.md        (6 elements expected)
- batch-4-contracts.md    (3 elements expected)
- batch-5-decisions.md    (3 elements expected)
- batch-6-orchestrator.md (1 element expected — short-key only)

Constraints:
- No commentary between batches.
- Return the combined output as a single final message.
- Use Read once per batch file.
- Flag any anomalies (wrong element count, ambiguous extraction) in a trailing "Anomalies" section.
```

Save to `framework/examples/format-ab-v2/results/raw-<tier>.md`, then compare each output against canonical references in the v1 runbook (same semantic content).

## Manual mode (one batch at a time, with /clear between)

Each batch file inlines its own legend(s) so each is fully self-contained.

| Batch | File | Format(s) | Elements |
|---|---|---|---|
| 1 | `prompts/batch-1-log.md` | short-key + positional + DSL | 6 |
| 2 | `prompts/batch-2-digest.md` | short-key | 1 |
| 3 | `prompts/batch-3-repos.md` | short-key + positional + DSL | 6 |
| 4 | `prompts/batch-4-contracts.md` | short-key + positional + DSL | 3 |
| 5 | `prompts/batch-5-decisions.md` | short-key + positional + DSL | 3 |
| 6 | `prompts/batch-6-orchestrator.md` | short-key | 1 |

Copy: `cat framework/examples/format-ab-v2/results/prompts/batch-N-<type>.md | pbcopy`.

To regenerate after fixture edits: `./framework/bin/build-parse-batches-v2.sh`.

## Scoring rubric (same as v1)

| Outcome | Definition | Score |
|---|---|---|
| PASS | Every canonical structured field present with correct type and value; body field semantically equivalent. | ✅ |
| PARTIAL | All structured fields present, but body misses a substantive point OR adds a hallucinated field. | ⚠️ |
| FAIL | Any structured field missing, wrong type, or wrong value. | ❌ |

## Canonical references

Use the v1 runbook's canonical sections — `framework/examples/format-ab/results/parse-reliability-runbook.md`. The scenario content is identical; only the encoding differs. For each v2 batch element, compare to the corresponding canonical JSON for that artefact type.

## Results tables

### Haiku 4.5

Raw output: `raw-haiku-4-5.md`. Single session, all 6 batches in one pass.

| Artefact (v2 variant)           | Result | Notes |
|---------------------------------|--------|-------|
| log / short-key (api-shipped)   | ✅     | Kept `kind: cc` (faithful to source); did not expand enum to `contract-change`. Legend doesn't include enum mapping for short-key. |
| log / short-key (worker-ack)    | ✅     | Same — kept `kind: a` faithfully. |
| log / positional (api-shipped)  | ✅     | Kept `kind: cc` faithfully. |
| log / positional (worker-ack)   | ✅     | Kept `kind: a` faithfully. |
| log / DSL (api-shipped)         | ✅     | Kept `kind: cc`; DSL legend declared the enum mapping but Haiku didn't apply it on extraction. |
| log / DSL (worker-ack)          | ✅     | Same. |
| digest / short-key              | ✅     | All fields including nested `per_repo` and `where_to_look` extracted cleanly. |
| repos / short-key (api)         | ✅     |       |
| repos / short-key (worker)      | ✅     |       |
| repos / positional (api)        | ✅     | Inline JSON in `contracts_in_play`, `open_questions` columns extracted correctly. |
| repos / positional (worker)     | ✅     | Inline JSON parsed cleanly. |
| repos / DSL (api)               | ✅     | `contracts: name@v(role; consumer=...)` shorthand expanded to canonical objects. |
| repos / DSL (worker)            | ✅     | Same; worker's missing `consumer=` correctly omitted (not invented). |
| contracts / short-key           | ✅     |       |
| contracts / positional          | ✅     | Inline JSON in queue/payload_fields/expectations all parsed. |
| contracts / DSL                 | ✅     | Backend kept as DSL's compressed `Redis-bull` faithfully. Payload `f(type;req;notes)` tuples decoded correctly. |
| decisions / short-key           | ✅     |       |
| decisions / positional          | ✅     | Inline JSON in `alternatives_rejected` parsed. |
| decisions / DSL                 | ✅     | DSL's terser wording preserved faithfully (not normalized to the longer short-key/positional version). |
| orchestrator / short-key        | ✅     |       |

### Sonnet 4.6

Raw output: `raw-sonnet-4-6.md`. Single session, all 6 batches in one pass.

| Artefact (v2 variant)           | Result | Notes |
|---------------------------------|--------|-------|
| log / short-key (api-shipped)   | ✅     | **Expanded `kind: cc` → `contract-change`**; only tier of the three to apply the enum mapping inferentially. |
| log / short-key (worker-ack)    | ✅     | Same — `kind: a` → `answer`. |
| log / positional (api-shipped)  | ✅     | Same enum expansion. |
| log / positional (worker-ack)   | ✅     | Same. |
| log / DSL (api-shipped)         | ✅     | Same — used the legend's enum mapping. |
| log / DSL (worker-ack)          | ✅     | Same. |
| digest / short-key              | ✅     |       |
| repos / short-key (api)         | ✅     |       |
| repos / short-key (worker)      | ✅     |       |
| repos / positional (api)        | ✅     |       |
| repos / positional (worker)     | ✅     |       |
| repos / DSL (api)               | ✅     |       |
| repos / DSL (worker)            | ✅     |       |
| contracts / short-key           | ✅     |       |
| contracts / positional          | ✅     |       |
| contracts / DSL                 | ✅     | Backend kept as DSL's `Redis-bull`. |
| decisions / short-key           | ✅     |       |
| decisions / positional          | ✅     |       |
| decisions / DSL                 | ✅     |       |
| orchestrator / short-key        | ✅     |       |

### Opus 4.7

Raw output: `raw-opus-4-7.md`. Single session, all 6 batches in one pass. Included a detailed "Anomalies" section explaining DSL parsing choices.

| Artefact (v2 variant)           | Result | Notes |
|---------------------------------|--------|-------|
| log / short-key (api-shipped)   | ✅     | Kept `kind: cc` faithfully — same as Haiku, opposite of Sonnet. |
| log / short-key (worker-ack)    | ✅     | Same. |
| log / positional (api-shipped)  | ✅     | Kept `kind: cc` faithfully. |
| log / positional (worker-ack)   | ✅     | Same. |
| log / DSL (api-shipped)         | ✅     | Kept `kind: cc` faithfully; documented this in Anomalies section. |
| log / DSL (worker-ack)          | ✅     | Same. |
| digest / short-key              | ✅     |       |
| repos / short-key (api)         | ✅     |       |
| repos / short-key (worker)      | ✅     |       |
| repos / positional (api)        | ✅     |       |
| repos / positional (worker)     | ✅     |       |
| repos / DSL (api)               | ✅     | Explicit anomaly note: worker missing `consumer=` correctly omitted, not invented. |
| repos / DSL (worker)            | ✅     | Same. |
| contracts / short-key           | ✅     |       |
| contracts / positional          | ✅     |       |
| contracts / DSL                 | ✅     | Explicit anomaly note on faithful `Redis-bull` extraction. |
| decisions / short-key           | ✅     |       |
| decisions / positional          | ✅     |       |
| decisions / DSL                 | ✅     | Explicit anomaly note: DSL's terser wording preserved verbatim, not normalized. |
| orchestrator / short-key        | ✅     |       |

## After all three sweeps

Hand the filled tables back; I'll fold the matrix into the v2 ADR's per-artefact table and flip the status to `accepted` (or demote any v2 candidate that flunks parse-reliability badly enough to disqualify it — DSL is the highest-risk format here given the least precedent in training data).
