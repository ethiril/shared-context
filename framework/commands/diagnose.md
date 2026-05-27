---
description: Analyze diagnostics-mode traces for a feature — agent pathing, index hit-rate, protocol deviations
argument-hint: <feature-slug>
model: claude-opus-4-7
---

Analyze framework usage for feature **$ARGUMENTS** from diagnostics-mode traces. Read-only — reports how agents actually moved through the framework so we can improve it. Writes nothing to shared-context.

**What this is.** *Diagnostics mode* is an opt-in `PreToolUse` hook (`framework/bin/hook-diagnostics.sh`) that logs every Read/Write/Edit/Bash from **outside** the model's context — zero agent-token cost. `framework/bin/analyze-trace.py` reconstructs index hit/miss, resume fast-exit, and protocol deviations from the trace alone. The agent never reports on itself; the numbers are heuristic (the path taken, not stated intent).

### 1. Confirm the mode is enabled

Diagnostics is **off by default**. It's on for a repo only if `<repo>/.claude/settings.local.json` wires the hook:

```json
{
  "hooks": {
    "PreToolUse": [
      { "matcher": "Read|Write|Edit|Bash",
        "hooks": [ { "type": "command",
          "command": "<shared-context-root>/framework/bin/hook-diagnostics.sh" } ] } ]
  }
}
```

If `features/$ARGUMENTS/.diagnostics/` has no `*.trace` files, the mode wasn't enabled for the sessions you care about. Tell the user how to enable it (above), then stop — there's nothing to analyze yet.

### 2. Run the analyzer

```bash
python3 <shared-context-root>/framework/bin/analyze-trace.py $ARGUMENTS
```

Add `--session <id>` for one session, `--root <path>` if not derivable. It prints a per-session table + an aggregate + auto-generated hints.

### 3. Interpret for framework improvement

Read the aggregate against the framework's mission (high context, low tokens). Translate numbers into concrete framework changes — don't just restate them:

- **Low fast-exit rate** on resume-shaped sessions → inboxes rarely empty (fine), or the §0 quick-gate isn't firing (investigate the cursor/`last_log_read` comparison).
- **Low index hit-rate** → descriptions/keywords in `files.dsl` don't match how agents search. Recommend richer keywords or sharper descriptions; consider whether `files.dsl` is even populated yet.
- **Deviations > lookups** → agents open source files without consulting the index. Check README §2's lookup rule is loaded, or that the index has coverage for the files being read.
- **Redundant reads** → same file opened repeatedly in a session; the index isn't short-circuiting re-reads. Often a symptom of stale or missing descriptions.
- **High source-read token estimate** → where the token budget is actually going; the files most-read are the best candidates for high-quality index entries.

### 4. Report

A short report: the aggregate numbers, the 1–3 highest-leverage framework changes they imply, and whether the sample is large enough to trust (few sessions → directional only). No wall of text.

**Budget ≤ 4k tokens.** This is analysis, not remediation — propose framework changes, don't apply them here.
