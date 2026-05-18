#!/usr/bin/env bash
#
# Build the ready-to-paste batch prompts for the v2 parse-reliability
# runbook. Mirrors framework/bin/build-parse-batches.sh but for the level-2
# candidates under framework/examples/format-ab-v2/.
#
# Run from the shared-context root:
#   ./framework/bin/build-parse-batches-v2.sh

set -eo pipefail

script_directory="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
shared_context_root="$(cd -- "$script_directory/../.." && pwd)"
output_directory="$shared_context_root/framework/examples/format-ab-v2/results/prompts"
v2="$shared_context_root/framework/examples/format-ab-v2"
legends="$v2/legends"

mkdir -p "$output_directory"

inline_fixture() {
  # $1 label  $2 file
  printf -- '--- %s\n```\n' "$1"
  cat "$2"
  printf '\n```\n\n'
}

inline_legend() {
  # $1 candidate-name  $2 legend-file
  printf -- '--- LEGEND (%s)\n```\n' "$1"
  cat "$2"
  printf '\n```\n\n'
}

build_log() {
  out="$output_directory/batch-1-log.md"
  {
    cat <<'HEAD'
You will receive 5 shared-context log artefacts in 3 new on-disk formats: short-key JSONL (2 events in one file), positional records (2 events), and a domain DSL (2 events). Each format has a legend that defines its key map / schema / grammar; the legend is shared across all artefacts in that format. Extract canonical fields as a JSON array of 6 objects in the order the artefacts appear (short-key JSONL yields 2 elements at its position; positional yields 2; DSL yields 2). Return ONLY the JSON array, no prose.

Expected fields per object: type, kind, from, at, to[], summary, refs[] (may be empty), body.

Kind enum (used in DSL): cc=contract-change, q=question, a=answer, fy=fyi, bl=blocker, pv=pivot, ch=change, ak=ack, tk=ticket-update.

HEAD
    inline_legend "short-key" "$legends/keys.json"
    inline_legend "positional" "$legends/positional.schemas.md"
    inline_legend "DSL" "$legends/dsl.grammars.md"
    inline_fixture "Artefact set 1 — short-key JSONL (2 events)" "$v2/log/short-key/log.jsonl"
    inline_fixture "Artefact set 2 — positional (2 events)" "$v2/log/positional/log.positional"
    inline_fixture "Artefact set 3 — DSL (2 events)" "$v2/log/dsl/log.dsl"
  } > "$out"
  echo "wrote $out"
}

build_digest() {
  out="$output_directory/batch-2-digest.md"
  {
    cat <<'HEAD'
You will receive 1 shared-context digest artefact in short-key JSONL format. Extract canonical fields as a JSON object. Return ONLY the JSON object, no prose.

Expected fields: type, author, at, summary, per_repo (map of repo to state), contracts_active[], decisions_live[], open_cross_repo[], shipped_since_bootstrap[] (objects with at least repo + what), where_to_look (map).

HEAD
    inline_legend "short-key" "$legends/keys.json"
    inline_fixture "Artefact (short-key)" "$v2/digest/short-key/2026-01-10T10-30-00-api.json"
  } > "$out"
  echo "wrote $out"
}

build_repos() {
  out="$output_directory/batch-3-repos.md"
  {
    cat <<'HEAD'
You will receive 6 shared-context repo-status artefacts. They cover 2 repos (api, worker) × 3 v2 formats (short-key, positional, DSL). Extract canonical fields as a JSON array of 6 objects in order. Return ONLY the JSON array.

Expected fields: type, repo, at, summary, current_goal, done[], next[], blocked_on[], contracts_in_play[] (objects with at least name + version), open_questions[].

HEAD
    inline_legend "short-key" "$legends/keys.json"
    inline_legend "positional" "$legends/positional.schemas.md"
    inline_legend "DSL" "$legends/dsl.grammars.md"
    inline_fixture "Artefact 1 — short-key (api)" "$v2/repos/short-key/api-2026-01-10T09-30-00.json"
    inline_fixture "Artefact 2 — short-key (worker)" "$v2/repos/short-key/worker-2026-01-10T10-15-00.json"
    inline_fixture "Artefact 3 — positional (api)" "$v2/repos/positional/api-2026-01-10T09-30-00.positional"
    inline_fixture "Artefact 4 — positional (worker)" "$v2/repos/positional/worker-2026-01-10T10-15-00.positional"
    inline_fixture "Artefact 5 — DSL (api)" "$v2/repos/dsl/api-2026-01-10T09-30-00.dsl"
    inline_fixture "Artefact 6 — DSL (worker)" "$v2/repos/dsl/worker-2026-01-10T10-15-00.dsl"
  } > "$out"
  echo "wrote $out"
}

build_contracts() {
  out="$output_directory/batch-4-contracts.md"
  {
    cat <<'HEAD'
You will receive 3 shared-context contract artefacts in 3 v2 formats (short-key, positional, DSL). Extract canonical fields as a JSON array of 3 objects in order. Return ONLY the JSON array.

Expected fields: type, name, version, author, at, summary, consumers[], breaking (bool), status, queue (object with name, backend, visibility_timeout_seconds), payload_fields (map: field_name → {type, required, notes}), expectations (map with producer, consumer, coupling).

HEAD
    inline_legend "short-key" "$legends/keys.json"
    inline_legend "positional" "$legends/positional.schemas.md"
    inline_legend "DSL" "$legends/dsl.grammars.md"
    inline_fixture "Artefact 1 — short-key" "$v2/contracts/short-key/welcome-email-job-v1.0.0.json"
    inline_fixture "Artefact 2 — positional" "$v2/contracts/positional/welcome-email-job-v1.0.0.positional"
    inline_fixture "Artefact 3 — DSL" "$v2/contracts/dsl/welcome-email-job-v1.0.0.dsl"
  } > "$out"
  echo "wrote $out"
}

build_decisions() {
  out="$output_directory/batch-5-decisions.md"
  {
    cat <<'HEAD'
You will receive 3 shared-context decision (ADR) artefacts in 3 v2 formats (short-key, positional, DSL). Extract canonical fields as a JSON array of 3 objects in order. Return ONLY the JSON array.

Expected fields: type, title, author, at, summary, status, affects[], rule (string), why[], alternatives_rejected[] (objects with option + reason), consequences[].

HEAD
    inline_legend "short-key" "$legends/keys.json"
    inline_legend "positional" "$legends/positional.schemas.md"
    inline_legend "DSL" "$legends/dsl.grammars.md"
    inline_fixture "Artefact 1 — short-key" "$v2/decisions/short-key/2026-01-10T09-00-00-fire-and-forget-semantics.json"
    inline_fixture "Artefact 2 — positional" "$v2/decisions/positional/2026-01-10T09-00-00-fire-and-forget-semantics.positional"
    inline_fixture "Artefact 3 — DSL" "$v2/decisions/dsl/2026-01-10T09-00-00-fire-and-forget-semantics.dsl"
  } > "$out"
  echo "wrote $out"
}

build_orchestrator() {
  out="$output_directory/batch-6-orchestrator.md"
  {
    cat <<'HEAD'
You will receive 1 shared-context orchestrator-snapshot artefact in short-key JSONL format. Extract canonical fields as a JSON object. Return ONLY the JSON object, no prose.

Expected fields: type, author, at, status, summary, headline (string), where_each_repo_stands (map of repo to state/note), shipped_since_last[] (objects with what + ref), decisions_made[], open_for_human[], next_up (map of repo or "joint" to plan).

HEAD
    inline_legend "short-key" "$legends/keys.json"
    inline_fixture "Artefact (short-key)" "$v2/orchestrator/short-key/2026-01-10T10-35-00-orchestrator.json"
  } > "$out"
  echo "wrote $out"
}

build_log
build_digest
build_repos
build_contracts
build_decisions
build_orchestrator
