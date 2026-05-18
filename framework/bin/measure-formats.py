#!/usr/bin/env python3
"""
measure-formats.py — A/B token-cost harness for `agent-format-pass`.

Walks the fixture folders under `framework/examples/format-ab/` and the
canonical baseline under `framework/examples/sample-feature/`, and emits a
comparison table per artefact type. Token counts use `tiktoken cl100k_base`
when available; falls back to character/word counts with a banner if not.

This script does NOT measure parse-reliability — that needs LLM calls.
Use `--parse-prompts` to emit the structured-extraction prompts you can run
manually inside Claude Code sessions, then paste the per-fixture results
back into the comparison table.

Usage:
    python3 framework/bin/measure-formats.py              # token comparison
    python3 framework/bin/measure-formats.py --markdown   # markdown table output
    python3 framework/bin/measure-formats.py --parse-prompts > prompts.md
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from pathlib import Path

try:
    import tiktoken
    _ENCODER = tiktoken.get_encoding("cl100k_base")
    _TOKEN_BACKEND = "tiktoken cl100k_base"
except ImportError:
    _ENCODER = None
    _TOKEN_BACKEND = "char/word approximation (install tiktoken for closer-to-Claude numbers: pip install tiktoken)"


SCRIPT_DIR = Path(__file__).resolve().parent
FRAMEWORK_DIR = SCRIPT_DIR.parent
SHARED_ROOT = FRAMEWORK_DIR.parent
BASELINE_DIR = FRAMEWORK_DIR / "examples" / "sample-feature"
FIXTURES_DIR = FRAMEWORK_DIR / "examples" / "format-ab"
FIXTURES_DIR_V2 = FRAMEWORK_DIR / "examples" / "format-ab-v2"


# Artefact type -> (baseline subpath, candidates: {variant_name: subpath})
ARTEFACTS: dict[str, dict[str, Path]] = {
    "log":          {"md-yaml": BASELINE_DIR / "log",
                     "toml":    FIXTURES_DIR / "log" / "toml",
                     "jsonl":   FIXTURES_DIR / "log" / "jsonl"},
    "digest":       {"md-yaml":   BASELINE_DIR / "digest",
                     "denser-md": FIXTURES_DIR / "digest" / "denser-md",
                     "toml":      FIXTURES_DIR / "digest" / "toml"},
    "repos":        {"md-yaml":   BASELINE_DIR / "repos",
                     "yaml-only": FIXTURES_DIR / "repos" / "yaml-only",
                     "toml":      FIXTURES_DIR / "repos" / "toml"},
    "contracts":    {"md-yaml":     BASELINE_DIR / "contracts",
                     "toml":        FIXTURES_DIR / "contracts" / "toml",
                     "json-schema": FIXTURES_DIR / "contracts" / "json-schema"},
    "decisions":    {"md-yaml":   BASELINE_DIR / "decisions",
                     "denser-md": FIXTURES_DIR / "decisions" / "denser-md",
                     "toml":      FIXTURES_DIR / "decisions" / "toml"},
    "orchestrator": {"md-yaml":   BASELINE_DIR / "orchestrator",
                     "denser-md": FIXTURES_DIR / "orchestrator" / "denser-md",
                     "hybrid":    FIXTURES_DIR / "orchestrator" / "hybrid"},
}


# v1 winning variant per artefact (used as the second baseline in v2 comparison).
V1_WINNERS: dict[str, str] = {
    "log":          "jsonl",
    "digest":       "denser-md",
    "repos":        "yaml-only",
    "contracts":    "toml",
    "decisions":    "denser-md",
    "orchestrator": "denser-md",
}


# v2 candidates per artefact. None means N/A (not feasible for this artefact).
ARTEFACTS_V2: dict[str, dict[str, Path | None]] = {
    "log":          {"short-key":  FIXTURES_DIR_V2 / "log" / "short-key",
                     "positional": FIXTURES_DIR_V2 / "log" / "positional",
                     "dsl":        FIXTURES_DIR_V2 / "log" / "dsl"},
    "digest":       {"short-key":  FIXTURES_DIR_V2 / "digest" / "short-key",
                     "positional": None,
                     "dsl":        None},
    "repos":        {"short-key":  FIXTURES_DIR_V2 / "repos" / "short-key",
                     "positional": FIXTURES_DIR_V2 / "repos" / "positional",
                     "dsl":        FIXTURES_DIR_V2 / "repos" / "dsl"},
    "contracts":    {"short-key":  FIXTURES_DIR_V2 / "contracts" / "short-key",
                     "positional": FIXTURES_DIR_V2 / "contracts" / "positional",
                     "dsl":        FIXTURES_DIR_V2 / "contracts" / "dsl"},
    "decisions":    {"short-key":  FIXTURES_DIR_V2 / "decisions" / "short-key",
                     "positional": FIXTURES_DIR_V2 / "decisions" / "positional",
                     "dsl":        FIXTURES_DIR_V2 / "decisions" / "dsl"},
    "orchestrator": {"short-key":  FIXTURES_DIR_V2 / "orchestrator" / "short-key",
                     "positional": None,
                     "dsl":        None},
}


# Per-candidate legend file (read once per session that uses the format).
LEGEND_FILES: dict[str, Path] = {
    "short-key":  FIXTURES_DIR_V2 / "legends" / "keys.json",
    "positional": FIXTURES_DIR_V2 / "legends" / "positional.schemas.md",
    "dsl":        FIXTURES_DIR_V2 / "legends" / "dsl.grammars.md",
}


# Legend amortisation divisor: how many artefact reads share the legend cost.
LEGEND_AMORTISATION: dict[str, int] = {
    "raw":                 10**9,  # effectively infinite — legend cost ignored
    "amortised-1session":  5,      # typical /catch-up reads ~5 artefacts
    "amortised-10sessions": 50,
}


@dataclass
class Measurement:
    files: int
    chars: int
    words: int
    tokens: int | None  # None if tiktoken unavailable


def measure_path(p: Path) -> Measurement:
    """Walk every file under p (or just p if it's a file) and sum the metrics."""
    files = sorted(f for f in p.rglob("*") if f.is_file())
    chars = words = 0
    tokens: int | None = 0 if _ENCODER else None
    for f in files:
        text = f.read_text(encoding="utf-8")
        chars += len(text)
        words += len(text.split())
        if _ENCODER is not None:
            tokens += len(_ENCODER.encode(text))
    return Measurement(files=len(files), chars=chars, words=words, tokens=tokens)


def pct_delta(baseline: int, candidate: int) -> str:
    if baseline == 0:
        return "n/a"
    delta = (candidate - baseline) / baseline * 100
    sign = "+" if delta >= 0 else ""
    return f"{sign}{delta:.1f}%"


def emit_comparison(as_markdown: bool) -> str:
    lines: list[str] = []
    lines.append(f"# Format A/B — token-cost comparison")
    lines.append("")
    lines.append(f"Token backend: **{_TOKEN_BACKEND}**")
    lines.append("")

    for artefact, variants in ARTEFACTS.items():
        # Measure each variant
        results: dict[str, Measurement] = {}
        for variant, path in variants.items():
            if not path.exists():
                results[variant] = Measurement(0, 0, 0, 0 if _ENCODER else None)
            else:
                results[variant] = measure_path(path)

        baseline = results.get("md-yaml")
        if baseline is None:
            continue

        lines.append(f"## `{artefact}/`")
        lines.append("")
        if as_markdown:
            if _ENCODER is not None:
                header = "| variant | files | chars | words | tokens | Δ chars | Δ words | Δ tokens |"
                divider = "|---|---|---|---|---|---|---|---|"
            else:
                header = "| variant | files | chars | words | Δ chars | Δ words |"
                divider = "|---|---|---|---|---|---|"
            lines.append(header)
            lines.append(divider)
        else:
            if _ENCODER is not None:
                lines.append(f"{'variant':<14}{'files':>7}{'chars':>9}{'words':>9}{'tokens':>9}{'Δ chars':>10}{'Δ words':>10}{'Δ tokens':>10}")
            else:
                lines.append(f"{'variant':<14}{'files':>7}{'chars':>9}{'words':>9}{'Δ chars':>10}{'Δ words':>10}")

        for variant, m in results.items():
            d_chars = pct_delta(baseline.chars, m.chars) if variant != "md-yaml" else "—"
            d_words = pct_delta(baseline.words, m.words) if variant != "md-yaml" else "—"
            if _ENCODER is not None:
                d_tokens = pct_delta(baseline.tokens, m.tokens) if variant != "md-yaml" else "—"
                if as_markdown:
                    lines.append(f"| {variant} | {m.files} | {m.chars} | {m.words} | {m.tokens} | {d_chars} | {d_words} | {d_tokens} |")
                else:
                    lines.append(f"{variant:<14}{m.files:>7}{m.chars:>9}{m.words:>9}{m.tokens:>9}{d_chars:>10}{d_words:>10}{d_tokens:>10}")
            else:
                if as_markdown:
                    lines.append(f"| {variant} | {m.files} | {m.chars} | {m.words} | {d_chars} | {d_words} |")
                else:
                    lines.append(f"{variant:<14}{m.files:>7}{m.chars:>9}{m.words:>9}{d_chars:>10}{d_words:>10}")
        lines.append("")

    # Catch-up read-set aggregate.
    # The /catch-up protocol reads: latest orchestrator snapshot + log entries
    # newer than the cursor + latest contract per API surface. For our 2-entry
    # scenario that's: 1 orchestrator + 2 logs + 1 contract. We compute the
    # combined cost per format choice (best alternative per artefact type
    # against md-yaml across the board).
    lines.append("## Catch-up read-set (aggregate)")
    lines.append("")
    lines.append("Read set = 1 orchestrator snapshot + N log entries + 1 contract. Per-format aggregate is the sum of those artefacts when rendered in that variant.")
    lines.append("")
    if as_markdown:
        if _ENCODER is not None:
            lines.append("| combo | chars | words | tokens | Δ chars | Δ words | Δ tokens |")
            lines.append("|---|---|---|---|---|---|---|")
        else:
            lines.append("| combo | chars | words | Δ chars | Δ words |")
            lines.append("|---|---|---|---|---|")

    def combo_measure(orch_variant: str, log_variant: str, contract_variant: str) -> Measurement:
        chars = words = 0
        tokens: int | None = 0 if _ENCODER else None
        for variant, artefact in ((orch_variant, "orchestrator"), (log_variant, "log"), (contract_variant, "contracts")):
            path = ARTEFACTS[artefact][variant]
            if path.exists():
                m = measure_path(path)
                chars += m.chars
                words += m.words
                if _ENCODER is not None and m.tokens is not None:
                    tokens += m.tokens
        return Measurement(files=0, chars=chars, words=words, tokens=tokens)

    combos = [
        ("all-md-yaml (baseline)", "md-yaml", "md-yaml", "md-yaml"),
        ("log=jsonl, rest=md-yaml", "md-yaml", "jsonl", "md-yaml"),
        ("log=toml, rest=md-yaml", "md-yaml", "toml", "md-yaml"),
        ("orch=denser-md, log=jsonl, ct=toml", "denser-md", "jsonl", "toml"),
        ("orch=hybrid, log=jsonl, ct=toml", "hybrid", "jsonl", "toml"),
        ("orch=denser-md, log=jsonl, ct=json-schema", "denser-md", "jsonl", "json-schema"),
    ]
    baseline_combo = combo_measure("md-yaml", "md-yaml", "md-yaml")
    for label, ov, lv, cv in combos:
        m = combo_measure(ov, lv, cv)
        d_chars = pct_delta(baseline_combo.chars, m.chars)
        d_words = pct_delta(baseline_combo.words, m.words)
        if _ENCODER is not None:
            d_tokens = pct_delta(baseline_combo.tokens, m.tokens)
            row = f"| {label} | {m.chars} | {m.words} | {m.tokens} | {d_chars} | {d_words} | {d_tokens} |"
        else:
            row = f"| {label} | {m.chars} | {m.words} | {d_chars} | {d_words} |"
        if as_markdown:
            lines.append(row)
        else:
            lines.append(row)
    lines.append("")
    return "\n".join(lines)


PARSE_PROMPT_TEMPLATE = """\
You are given a single shared-context artefact in {variant} format. Extract
its canonical fields as JSON. Return ONLY the JSON object, no prose.

Expected fields for `{artefact}`:
{expected_fields}

Artefact:
```
{body}
```
"""

EXPECTED_FIELDS: dict[str, str] = {
    "log": "- type (string)\n- kind (string)\n- from (string)\n- at (ISO timestamp)\n- to (array of strings)\n- summary (string)\n- refs (array of strings; may be absent)\n- body (string)",
    "digest": "- type (string)\n- author (string)\n- at (ISO timestamp)\n- summary (string)\n- feature (string; may be absent)\n- per_repo (map of repo to status)\n- contracts_active (array of strings)\n- decisions_live (array of strings)\n- open_cross_repo (array)\n- shipped_since_bootstrap (array of objects)",
    "repos": "- type (string)\n- repo (string)\n- at (ISO timestamp)\n- summary (string)\n- done (array of strings)\n- next (array of strings)\n- blocked_on (array)\n- contracts_in_play (array of objects)\n- open_questions (array of objects)",
    "contracts": "- type (string)\n- name (string)\n- version (string)\n- author (string)\n- at (ISO timestamp)\n- summary (string)\n- consumers (array of strings)\n- breaking (bool)\n- status (string)\n- payload_fields (map of field to {type, required, notes})",
    "decisions": "- type (string)\n- title (string)\n- author (string)\n- at (ISO timestamp)\n- summary (string)\n- status (string)\n- affects (array of strings)\n- rule (string)\n- why (array of strings)\n- alternatives_rejected (array of objects)\n- consequences (array of strings)",
    "orchestrator": "- type (string)\n- author (string)\n- at (ISO timestamp)\n- status (string)\n- summary (string)\n- headline (string)\n- where_each_repo_stands (map of repo to status)\n- shipped_since_last (array of objects)\n- decisions_made (array of strings)\n- open_for_human (array)\n- next_up (map of repo to plan)",
}


def emit_parse_prompts() -> str:
    """Print one extraction prompt per fixture file. Paste each into a fresh
    Claude Code session against each model tier and tally:
        - exact match against the canonical reference: PASS
        - any field missing or wrong type: FAIL (note which)
        - hallucinated extra fields: PARTIAL (still PASS for the metric)
    """
    sections: list[str] = []
    sections.append("# Parse-reliability prompts\n")
    sections.append("Run each prompt in a fresh Claude Code session (or against each model tier you care about). Record per-prompt PASS/FAIL in the ADR's per-artefact table.\n")
    for artefact, variants in ARTEFACTS.items():
        for variant, path in variants.items():
            if not path.exists():
                continue
            files = sorted(f for f in path.rglob("*") if f.is_file())
            for f in files:
                body = f.read_text(encoding="utf-8")
                prompt = PARSE_PROMPT_TEMPLATE.format(
                    variant=variant,
                    artefact=artefact,
                    expected_fields=EXPECTED_FIELDS.get(artefact, "(see canonical baseline file)"),
                    body=body,
                )
                rel = f.relative_to(SHARED_ROOT)
                sections.append(f"\n## `{rel}`  (artefact: {artefact}, variant: {variant})\n")
                sections.append(prompt)
    return "\n".join(sections)


def measure_legend(candidate: str) -> int:
    """Return the token count of the legend file for a v2 candidate, or 0 if no legend."""
    legend = LEGEND_FILES.get(candidate)
    if legend is None or not legend.exists() or _ENCODER is None:
        return 0
    return len(_ENCODER.encode(legend.read_text(encoding="utf-8")))


def emit_comparison_v2(as_markdown: bool, legend_mode: str) -> str:
    divisor = LEGEND_AMORTISATION[legend_mode]
    lines: list[str] = []
    lines.append("# Format A/B v2 — token-cost comparison")
    lines.append("")
    lines.append(f"Token backend: **{_TOKEN_BACKEND}**")
    lines.append(f"Legend amortisation mode: **{legend_mode}** (divisor = {divisor if divisor < 10**9 else '∞ (raw)'})")
    lines.append("")
    lines.append("Per-row deltas show v2 candidate vs (a) md+YAML baseline and (b) v1 winner. Amortised columns include `legend_tokens / divisor` added to the candidate's per-artefact token count.")
    lines.append("")

    for artefact in ARTEFACTS_V2:
        baseline = measure_path(ARTEFACTS[artefact]["md-yaml"])
        v1_winner_name = V1_WINNERS[artefact]
        v1_winner = measure_path(ARTEFACTS[artefact][v1_winner_name])

        lines.append(f"## `{artefact}/`")
        lines.append("")
        lines.append(f"Baselines: md+YAML = {baseline.tokens} tokens; v1 winner ({v1_winner_name}) = {v1_winner.tokens} tokens.")
        lines.append("")

        if as_markdown:
            lines.append("| variant | tokens (raw) | + legend amortised | Δ vs md+YAML | Δ vs v1 winner |")
            lines.append("|---|---|---|---|---|")

        for variant, path in ARTEFACTS_V2[artefact].items():
            if path is None:
                lines.append(f"| {variant} | N/A | N/A | N/A | N/A |" if as_markdown else f"  {variant:<12} N/A")
                continue
            if not path.exists():
                continue
            m = measure_path(path)
            legend_tokens = measure_legend(variant)
            legend_amortised = (legend_tokens // divisor) if divisor > 0 else 0
            effective = (m.tokens or 0) + legend_amortised
            d_base   = pct_delta(baseline.tokens or 0, effective)
            d_v1     = pct_delta(v1_winner.tokens or 0, effective)
            if as_markdown:
                lines.append(f"| {variant} | {m.tokens} | {effective} (+{legend_amortised}) | {d_base} | {d_v1} |")
            else:
                lines.append(f"  {variant:<12} raw={m.tokens:>5}  +leg={legend_amortised:>4}  eff={effective:>5}  vs md+YAML={d_base:>7}  vs v1={d_v1:>7}")
        lines.append("")

    # Catch-up combo aggregates
    lines.append("## Catch-up read-set aggregates")
    lines.append("")
    lines.append("Read set = 1 orchestrator + 2 logs + 1 contract. Each combo picks one variant per type.")
    lines.append("")

    def combo_measure_v2(orch_v: str, log_v: str, contract_v: str) -> int:
        total = 0
        legend_total = 0
        for variant, artefact in ((orch_v, "orchestrator"), (log_v, "log"), (contract_v, "contracts")):
            # Pull path from v1 or v2 map depending on which has it
            path = ARTEFACTS[artefact].get(variant) or (ARTEFACTS_V2[artefact].get(variant) if variant in ARTEFACTS_V2[artefact] else None)
            if path and path.exists():
                total += measure_path(path).tokens or 0
                if variant in LEGEND_FILES:
                    legend_total += measure_legend(variant)
        legend_amortised = legend_total // divisor if divisor > 0 else 0
        return total + legend_amortised

    baseline_combo = combo_measure_v2("md-yaml", "md-yaml", "md-yaml")
    v1_combo = combo_measure_v2(V1_WINNERS["orchestrator"], V1_WINNERS["log"], V1_WINNERS["contracts"])

    combos = [
        ("md+YAML baseline",                   "md-yaml",   "md-yaml",   "md-yaml"),
        ("v1 winners (denser-md + jsonl + toml)", V1_WINNERS["orchestrator"], V1_WINNERS["log"], V1_WINNERS["contracts"]),
        ("v2: short-key everywhere",            "short-key", "short-key", "short-key"),
        ("v2: orch=v1, log=short-key, ct=v1",   V1_WINNERS["orchestrator"], "short-key", V1_WINNERS["contracts"]),
        ("v2: orch=v1, log=positional, ct=v1",  V1_WINNERS["orchestrator"], "positional", V1_WINNERS["contracts"]),
        ("v2: orch=v1, log=dsl, ct=v1",         V1_WINNERS["orchestrator"], "dsl",       V1_WINNERS["contracts"]),
        ("v2: orch=v1, log=positional, ct=dsl", V1_WINNERS["orchestrator"], "positional", "dsl"),
        ("v2: orch=v1, log=dsl, ct=dsl",        V1_WINNERS["orchestrator"], "dsl",        "dsl"),
    ]

    if as_markdown:
        lines.append("| combo | tokens (eff) | Δ vs md+YAML | Δ vs v1 winners |")
        lines.append("|---|---|---|---|")
    for label, ov, lv, cv in combos:
        eff = combo_measure_v2(ov, lv, cv)
        d_base = pct_delta(baseline_combo, eff)
        d_v1   = pct_delta(v1_combo, eff)
        if as_markdown:
            lines.append(f"| {label} | {eff} | {d_base} | {d_v1} |")
        else:
            lines.append(f"  {label:<45} eff={eff:>5}  vs base={d_base:>7}  vs v1={d_v1:>7}")
    lines.append("")
    return "\n".join(lines)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--markdown", action="store_true", help="emit markdown tables instead of plain text")
    ap.add_argument("--parse-prompts", action="store_true", help="emit structured-extraction prompts instead of token counts")
    ap.add_argument("--v2", action="store_true", help="emit v2 comparison (level-2 candidates vs md+YAML and v1 winners)")
    ap.add_argument("--legend-mode", choices=list(LEGEND_AMORTISATION.keys()), default="amortised-1session",
                    help="legend amortisation mode for v2 (default: amortised-1session)")
    args = ap.parse_args()

    if args.parse_prompts:
        print(emit_parse_prompts())
    elif args.v2:
        print(emit_comparison_v2(as_markdown=args.markdown, legend_mode=args.legend_mode))
    else:
        print(emit_comparison(as_markdown=args.markdown))
    return 0


if __name__ == "__main__":
    sys.exit(main())
