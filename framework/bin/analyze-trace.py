#!/usr/bin/env python3
"""Analyze diagnostics traces for a feature — reconstruct the agent's pathing.

Reads ``features/<slug>/.diagnostics/*.trace`` (written by hook-diagnostics.sh,
TSV: ``iso<TAB>tool<TAB>cwd<TAB>path-or-command``) and infers framework
effectiveness signals *without any agent-side instrumentation* — everything
below is reconstructed from the tool-call sequence the hook observed:

  - resume fast-exit fired (early-out on an empty inbox)
  - index lookups, inferred hits / misses (records), hit-rate
  - protocol deviations (a source read with no preceding index lookup)
  - redundant reads (same source file opened 2+ times in a session)
  - rough token estimate of source bytes read

Inference is heuristic — it reads the path the agent actually took, not its
intentions. Treat the numbers as directional, not exact.

Usage:
  analyze-trace.py <feature-slug> [--root <shared-context-root>]
                                  [--session <id>] [--all]
"""

from __future__ import annotations

import argparse
import os
import re
import sys
from collections import defaultdict
from pathlib import Path

SOURCE_EXTENSIONS = {
    ".kt", ".kts", ".rs", ".dart", ".ts", ".tsx", ".js", ".jsx", ".py",
    ".swift", ".java", ".go", ".rb", ".c", ".cc", ".cpp", ".h", ".hpp",
    ".cs", ".php", ".scala", ".sql", ".m", ".mm",
}

CURSOR_RE = re.compile(r"cursors/[^/]+/current\.md$")
FEATURE_RE = re.compile(r"features/[a-z0-9][a-z0-9-]*/")
LS_LOG_RE = re.compile(r"\bls\b.*log/?")


def default_root() -> Path:
    # Script lives at <root>/framework/bin/analyze-trace.py.
    return Path(__file__).resolve().parent.parent.parent


def classify(tool: str, detail: str, root_str: str):
    """Return a set of tags describing what this event is."""
    tags = set()
    is_under_sc = root_str and detail.startswith(root_str)
    ext = os.path.splitext(detail)[1].lower()

    references_index = "files.dsl" in detail or "touched.dsl" in detail

    if tool == "Bash":
        if references_index:
            tags.add("index_grep")
        if LS_LOG_RE.search(detail):
            tags.add("log_ls")
    if tool in ("Write", "Edit") and (detail.endswith("files.dsl") or detail.endswith("touched.dsl")):
        tags.add("index_write")
    if tool == "Read" and CURSOR_RE.search(detail):
        tags.add("cursor_read")
    if tool in ("Write", "Edit") and CURSOR_RE.search(detail):
        tags.add("cursor_write")
    if tool == "Read" and "/orchestrator/" in detail:
        tags.add("orchestrator_read")
    if tool == "Read" and detail.endswith("MISSION.md"):
        tags.add("mission_read")

    # A "source read" is a Read of a code file that is NOT part of the
    # shared-context coordination tree.
    if tool == "Read" and not is_under_sc and ext in SOURCE_EXTENSIONS and not references_index:
        tags.add("source_read")

    return tags


def parse_trace(path: Path):
    events = []
    try:
        for line in path.read_text(errors="replace").splitlines():
            parts = line.split("\t")
            if len(parts) < 4:
                continue
            iso, tool, cwd, detail = parts[0], parts[1], parts[2], "\t".join(parts[3:])
            events.append((iso, tool, cwd, detail))
    except Exception:
        pass
    return events


def estimate_tokens(detail: str, cwd: str) -> int:
    """Rough token estimate from a source file's byte size (bytes / 4)."""
    candidate = detail
    if not os.path.isabs(candidate) and cwd:
        candidate = os.path.join(cwd, detail)
    try:
        return os.path.getsize(candidate) // 4
    except Exception:
        return 0


# A source read counts as "index-covered" only if a lookup happened within
# this many events before it. Beyond that, the read is treated as a cold read
# (the agent opened the file without consulting the index). Heuristic — tune
# if real traces show systematic mis-classification.
LOOKUP_WINDOW = 2


def analyze_session(events, root_str: str):
    result = {
        "events": len(events),
        "lookups": 0,
        "index_writes": 0,
        "reads_after_lookup": 0,
        "deviations": 0,
        "source_reads": 0,
        "tokens_read": 0,
        "redundant": 0,
        "fast_exit": False,
    }
    last_grep_index = None
    saw_orchestrator = False
    saw_mission = False
    saw_cursor_write = False
    saw_cursor_read = False
    saw_log_ls = False
    read_counts = defaultdict(int)

    for index, (iso, tool, cwd, detail) in enumerate(events):
        tags = classify(tool, detail, root_str)
        if "orchestrator_read" in tags:
            saw_orchestrator = True
        if "mission_read" in tags:
            saw_mission = True
        if "cursor_write" in tags:
            saw_cursor_write = True
        if "cursor_read" in tags:
            saw_cursor_read = True
        if "log_ls" in tags:
            saw_log_ls = True
        if "index_grep" in tags:
            result["lookups"] += 1
            last_grep_index = index
        if "index_write" in tags:
            result["index_writes"] += 1
        if "source_read" in tags:
            result["source_reads"] += 1
            result["tokens_read"] += estimate_tokens(detail, cwd)
            read_counts[detail] += 1
            covered = last_grep_index is not None and (index - last_grep_index) <= LOOKUP_WINDOW
            if covered:
                result["reads_after_lookup"] += 1
            else:
                result["deviations"] += 1

    result["redundant"] = sum(1 for _, n in read_counts.items() if n >= 2)
    # Resume early-out: touched the cursor but never loaded the heavy state,
    # and opened no source files.
    result["fast_exit"] = (
        saw_cursor_write
        and not saw_orchestrator
        and not saw_mission
        and result["source_reads"] == 0
        and (saw_log_ls or saw_cursor_read)
    )
    # Inferred hits: lookups that did not lead to opening the file.
    result["hits"] = max(0, result["lookups"] - result["reads_after_lookup"])
    result["misses"] = result["index_writes"]
    return result


def pct(numerator: int, denominator: int) -> str:
    if denominator <= 0:
        return "n/a"
    return f"{round(100 * numerator / denominator)}%"


def main() -> int:
    parser = argparse.ArgumentParser(description="Analyze diagnostics traces for a feature.")
    parser.add_argument("slug", help="feature slug under features/")
    parser.add_argument("--root", default=str(default_root()), help="shared-context root")
    parser.add_argument("--session", help="only this session id")
    parser.add_argument("--all", action="store_true", help="include all sessions (default)")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    root_str = str(root)
    diag_dir = root / "features" / args.slug / ".diagnostics"

    if not diag_dir.is_dir():
        print(f"No diagnostics for '{args.slug}'. Enable the mode (hook-diagnostics.sh) "
              f"and run a session first.\nLooked in: {diag_dir}")
        return 1

    traces = sorted(p for p in diag_dir.glob("*.trace"))
    if args.session:
        traces = [p for p in traces if p.stem.startswith(args.session)]
    if not traces:
        print(f"No .trace files in {diag_dir}")
        return 1

    agg = defaultdict(int)
    resume_shaped = 0

    print(f"Feature: {args.slug}   sessions: {len(traces)}   ({diag_dir})\n")
    print("Per session:")
    for trace in traces:
        events = parse_trace(trace)
        r = analyze_session(events, root_str)
        for key in ("lookups", "hits", "misses", "deviations", "source_reads", "tokens_read", "redundant"):
            agg[key] += r[key]
        # "Resume-shaped" = touched the cursor (a resume/catch-up signature).
        is_resume_shaped = r["fast_exit"] or r["source_reads"] >= 0
        if r["fast_exit"]:
            agg["fast_exits"] += 1
        if events:
            resume_shaped += 1
        short = trace.stem[:12]
        print(
            f"  {short:<14} events={r['events']:<4} "
            f"fast-exit={'Y' if r['fast_exit'] else 'N'}  "
            f"lookups={r['lookups']:<3} hits~{r['hits']:<3} misses~{r['misses']:<3} "
            f"deviations={r['deviations']:<3} src-reads={r['source_reads']:<3} "
            f"~tok={r['tokens_read']}"
        )

    print("\nAggregate:")
    print(f"  Resume fast-exits:            {agg['fast_exits']} of {resume_shaped} sessions")
    print(f"  Index lookups:                {agg['lookups']}")
    print(f"  Inferred hits:                {agg['hits']}  (hit-rate ~{pct(agg['hits'], agg['lookups'])})")
    print(f"  Records (inferred misses):    {agg['misses']}")
    print(f"  Protocol deviations:          {agg['deviations']}  (source read, no index lookup)")
    print(f"  Redundant reads:              {agg['redundant']}  (file opened 2+ times in a session)")
    print(f"  Source bytes read:            ~{agg['tokens_read']} tokens")

    print("\nHints:")
    if agg["deviations"] > agg["lookups"]:
        print("  - Deviations exceed lookups: agents are skipping the index. Check the §2 rule is loaded, or that keywords match how agents search.")
    if agg["lookups"] and agg["hits"] / max(agg["lookups"], 1) < 0.4:
        print("  - Low hit-rate: descriptions/keywords likely don't match real searches. Improve description quality or keyword coverage.")
    if agg["redundant"]:
        print("  - Redundant reads present: same files re-opened — the index isn't being consulted before re-reading.")
    if resume_shaped and agg["fast_exits"] == 0:
        print("  - No fast-exits observed: inboxes are rarely empty, or the quick-gate isn't firing on resume.")
    if not any([agg["deviations"] > agg["lookups"], agg["redundant"], (agg["lookups"] and agg["hits"] / max(agg["lookups"], 1) < 0.4)]):
        print("  - Nothing notable; pathing looks healthy for this sample.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
