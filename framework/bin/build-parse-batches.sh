#!/usr/bin/env bash
#
# Build the 6 ready-to-paste batch prompts for the parse-reliability
# runbook (framework/examples/format-ab/results/parse-reliability-runbook.md).
# Each generated file is a single self-contained prompt — copy its contents,
# paste into a Claude Code session set to the model tier you're testing.
#
# Run from the shared-context root:
#   ./framework/bin/build-parse-batches.sh

set -eo pipefail

script_directory="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
shared_context_root="$(cd -- "$script_directory/../.." && pwd)"
output_directory="$shared_context_root/framework/examples/format-ab/results/prompts"
baseline="$shared_context_root/framework/examples/sample-feature"
alt="$shared_context_root/framework/examples/format-ab"

mkdir -p "$output_directory"

inline_fixture() {
  # $1 label  $2 file
  printf -- '--- %s\n```\n' "$1"
  cat "$2"
  printf '```\n\n'
}

build_log() {
  out="$output_directory/batch-1-log.md"
  {
    cat <<'HEAD'
You will receive 5 shared-context log artefacts in 3 different on-disk formats (md+YAML, TOML, JSONL). The JSONL artefact contains 2 events; the others are 1 event each. Extract canonical fields as a JSON array of 6 objects, in the order the artefacts appear (the JSONL artefact yields 2 elements at its position). Return ONLY the JSON array, no prose.

Expected fields per object: type, kind, from, at, to[], summary, refs[] (may be empty), body.

HEAD
    inline_fixture "Artefact 1 (md+YAML, api-shipped)" "$baseline/log/2026-01-10T09-30-00-api-shipped.md"
    inline_fixture "Artefact 2 (md+YAML, worker-ack)" "$baseline/log/2026-01-10T10-15-00-worker-ack.md"
    inline_fixture "Artefact 3 (TOML, api-shipped)" "$alt/log/toml/2026-01-10T09-30-00-api-shipped.toml"
    inline_fixture "Artefact 4 (TOML, worker-ack)" "$alt/log/toml/2026-01-10T10-15-00-worker-ack.toml"
    inline_fixture "Artefact 5 (JSONL, 2 events — yield 2 array elements in order)" "$alt/log/jsonl/log.jsonl"
  } > "$out"
  echo "wrote $out"
}

build_digest() {
  out="$output_directory/batch-2-digest.md"
  {
    cat <<'HEAD'
You will receive 3 shared-context digest artefacts in 3 on-disk formats (md+YAML, denser-md, TOML). Extract canonical fields as a JSON array of 3 objects in order. Return ONLY the JSON array.

Expected fields: type, author, at, summary, per_repo (map of repo to state), contracts_active[], decisions_live[], open_cross_repo[], shipped_since_bootstrap[] (objects with at least repo + what), where_to_look (map or absent).

HEAD
    inline_fixture "Artefact 1 (md+YAML)" "$baseline/digest/2026-01-10T10-30-00-api.md"
    inline_fixture "Artefact 2 (denser-md)" "$alt/digest/denser-md/2026-01-10T10-30-00-api.md"
    inline_fixture "Artefact 3 (TOML)" "$alt/digest/toml/2026-01-10T10-30-00-api.toml"
  } > "$out"
  echo "wrote $out"
}

build_repos() {
  out="$output_directory/batch-3-repos.md"
  {
    cat <<'HEAD'
You will receive 6 shared-context repo-status artefacts. They cover 2 repos (api, worker) × 3 on-disk formats (md+YAML, yaml-only frontmatter, TOML). Extract canonical fields as a JSON array of 6 objects in order. Return ONLY the JSON array.

Expected fields: type, repo, at, summary, current_goal (may be absent in md+YAML — derive from body if needed), done[], next[], blocked_on[], contracts_in_play[] (objects with at least name + version), open_questions[].

HEAD
    inline_fixture "Artefact 1 (md+YAML, api)" "$baseline/repos/api/2026-01-10T09-30-00.md"
    inline_fixture "Artefact 2 (md+YAML, worker)" "$baseline/repos/worker/2026-01-10T10-15-00.md"
    inline_fixture "Artefact 3 (yaml-only, api)" "$alt/repos/yaml-only/api-2026-01-10T09-30-00.md"
    inline_fixture "Artefact 4 (yaml-only, worker)" "$alt/repos/yaml-only/worker-2026-01-10T10-15-00.md"
    inline_fixture "Artefact 5 (TOML, api)" "$alt/repos/toml/api-2026-01-10T09-30-00.toml"
    inline_fixture "Artefact 6 (TOML, worker)" "$alt/repos/toml/worker-2026-01-10T10-15-00.toml"
  } > "$out"
  echo "wrote $out"
}

build_contracts() {
  out="$output_directory/batch-4-contracts.md"
  {
    cat <<'HEAD'
You will receive 3 shared-context contract artefacts in 3 on-disk formats (md+YAML, TOML, JSON Schema). Extract canonical fields as a JSON array of 3 objects in order. Return ONLY the JSON array.

Expected fields: type, name, version, author, at, summary, consumers[], breaking (bool), status, queue (object with name, backend, visibility_timeout_seconds), payload_fields (map: field_name → {type, required, notes}), expectations (map with producer, consumer, coupling).

For the JSON Schema artefact: lift fields from x-meta, x-queue, x-expectations extensions into the canonical positions.

HEAD
    inline_fixture "Artefact 1 (md+YAML)" "$baseline/contracts/welcome-email-job/2026-01-10T09-00-00-api-v1.0.0.md"
    inline_fixture "Artefact 2 (TOML)" "$alt/contracts/toml/welcome-email-job-v1.0.0.toml"
    inline_fixture "Artefact 3 (JSON Schema)" "$alt/contracts/json-schema/welcome-email-job-v1.0.0.json"
  } > "$out"
  echo "wrote $out"
}

build_decisions() {
  out="$output_directory/batch-5-decisions.md"
  {
    cat <<'HEAD'
You will receive 3 shared-context decision (ADR) artefacts in 3 on-disk formats (md+YAML, denser-md, TOML). Extract canonical fields as a JSON array of 3 objects in order. Return ONLY the JSON array.

Expected fields: type, title, author, at, summary, status, affects[], rule (string), why[], alternatives_rejected[] (objects with option + reason), consequences[].

For the md+YAML artefact: rule, why, alternatives_rejected, consequences are in the prose body — NOT in frontmatter. Derive them from the body.

HEAD
    inline_fixture "Artefact 1 (md+YAML)" "$baseline/decisions/2026-01-10T09-00-00-fire-and-forget-semantics.md"
    inline_fixture "Artefact 2 (denser-md)" "$alt/decisions/denser-md/2026-01-10T09-00-00-fire-and-forget-semantics.md"
    inline_fixture "Artefact 3 (TOML)" "$alt/decisions/toml/2026-01-10T09-00-00-fire-and-forget-semantics.toml"
  } > "$out"
  echo "wrote $out"
}

build_orchestrator() {
  out="$output_directory/batch-6-orchestrator.md"
  {
    cat <<'HEAD'
You will receive 3 shared-context orchestrator-snapshot artefacts in 3 on-disk formats (md+YAML, denser-md, hybrid). Extract canonical fields as a JSON array of 3 objects in order. Return ONLY the JSON array.

Expected fields: type, author, at, status, summary, headline (string), where_each_repo_stands (map of repo to state/note), shipped_since_last[] (objects with what + ref), decisions_made[], open_for_human[], next_up (map of repo or "joint" to plan).

HEAD
    inline_fixture "Artefact 1 (md+YAML)" "$baseline/orchestrator/2026-01-10T10-35-00-orchestrator.md"
    inline_fixture "Artefact 2 (denser-md)" "$alt/orchestrator/denser-md/2026-01-10T10-35-00-orchestrator.md"
    inline_fixture "Artefact 3 (hybrid)" "$alt/orchestrator/hybrid/2026-01-10T10-35-00-orchestrator.md"
  } > "$out"
  echo "wrote $out"
}

build_log
build_digest
build_repos
build_contracts
build_decisions
build_orchestrator
