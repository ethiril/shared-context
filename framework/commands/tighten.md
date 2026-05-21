---
description: Review + refactor + test-verify the current branch's changes — never the whole repo
argument-hint: <feature-slug>
model: claude-opus-4-7
---

Tighten the current branch's changes for feature **$ARGUMENTS**. Critical review, language-aware refactor, test audit, mutation verification — strictly scoped to what this branch added or modified.

**Hard rules — these are not suggestions.**

- **Scope is the branch diff. Never the whole repo.** Compute once at start, never widen.
- **Refuse to start if the working tree is dirty.** Mutation step needs a clean revert.
- **Don't invent tests where coverage is already adequate.** Filling a gap is fine; padding a test file because "more is better" is not.
- **No backfill cleanup.** Don't refactor unchanged files you happen to notice. Stay in the diff.

### 1. Establish scope

```bash
git status --porcelain          # MUST be empty
git merge-base HEAD origin/main # or main, or the configured base branch
git diff --name-only <merge-base>...HEAD
git diff <merge-base>...HEAD -- <file>   # per-file when reviewing
```

If working tree is dirty: stop and tell the human. Don't `git stash` automatically — that's a destructive call only they should make.

If the diff is huge (> 50 changed files or > 5000 net LOC), surface that with `AskUserQuestion`: proceed full / scope to a subdirectory / abort. Default recommendation: scope down.

Record the merge-base SHA and the changed-file list in memory. Every subsequent phase reads from this set only.

### 2. Phase 1 — Critical review (changed lines only)

For each changed file, read the diff hunks and apply the rubric below. **Do not read the full file unless a hunk references something outside it.**

Flag:
- Dead code: unused params, unreferenced helpers, vars assigned and never read.
- Over-abstraction: a class/interface/helper introduced for one caller; a generic wrapper around one concrete use.
- Defensive code for impossible cases: validation of values the type system already guarantees; error-handling for branches that can't be reached from internal callers.
- Backwards-compat shims for code that hasn't shipped yet (renamed `_unused`, re-exports of removed types, `// removed` tombstones).
- Comments restating what the code says, or referencing the task/PR/issue rather than the why.
- Premature config/feature-flag plumbing for behavior with no second caller.
- Three+ near-duplicate lines that *could* be a helper, but only if the duplication is real and the helper has a clean name.

Present findings as a tight list. For each item: file:line, one-sentence rationale, proposed change. Then apply the fixes — but bundle them as one commit-worthy change per file, not 30 micro-edits.

### 3. Phase 2 — Language-aware refactor

Per changed file's language:

| Language extension(s) in diff   | Action                                                                         |
|---------------------------------|--------------------------------------------------------------------------------|
| `.kt`, `.kts`                   | Invoke `/kotlin-refactor` (it already encodes our Kotlin rules)                |
| `.ts`, `.tsx`, `.js`, `.jsx`    | Apply the same principles inline: clean naming, no `as any`/`!`, extract a helper only when reuse already exists in the diff, modular tests |
| `.py`                           | Same principles: clean naming, no broad `except`, helpers only on real reuse  |
| `.swift`                        | Same principles: no force-unwrap (`!`), no `try!`, no `as!` outside test fixtures |
| Other                           | State the language wasn't auto-handled; apply the principles by hand          |

For non-Kotlin: don't create a new "refactor skill" inline — just hold the diff to the same bar.

### 4. Phase 3 — Test audit (changed files only)

For each changed source file, locate its tests:

| Language       | Test discovery                                                          |
|----------------|-------------------------------------------------------------------------|
| Kotlin         | `src/test/**` mirror path, or `*Test.kt` siblings                       |
| TS/JS          | `*.test.{ts,tsx,js,jsx}` siblings or `__tests__/` peer dir              |
| Python         | `tests/` mirror path or `test_<name>.py` sibling                        |
| Swift          | `*Tests.swift` in the package's test target                              |

For each (source, tests) pair, classify coverage of the **diff lines only** (not the whole file):

- **Sufficient** → state explicitly: `<file>: coverage sufficient, no new tests`. Move on.
- **Gap** → write the minimum tests that exercise the new behavior. One test per branch, not three. Names describe the behavior, not the implementation.
- **No tests exist at all for new behavior** → write the smallest meaningful set.

If a changed file has no corresponding test target (e.g., a config file, a pure type def), say so and skip.

### 5. Phase 4 — Mutation verification (changed lines only)

One mutation per changed source file. Skip files with no executable changes (formatting, imports-only, comments-only, type-aliases-only).

**Pick the line.** From the diff hunks for that file, choose one changed line whose behavior matters — a conditional, a return, an operator, a constant, a guard. Skip whitespace, imports, comments, log strings.

**Pick the mutation.** One change that *should* break a test:
- Negate a condition (`if (x)` → `if (!x)`)
- Swap an operator (`<` → `<=`, `&&` → `||`)
- Replace a return with a null/default/empty
- Flip a constant (`true` → `false`, `1` → `0`, `"foo"` → `""`)

**Verify per file, one at a time:**

```bash
# Apply mutation (Edit tool, one line)
# Run only the tests that exercise this file
<test runner> <test-target-for-this-file>
# Required: at least one test FAILS
# Revert mutation (Edit tool, one line back)
# Rerun: all green
```

If no test fails: that's a real gap. Add the minimum test that catches the mutation, then re-run with the mutation reapplied to confirm the new test fails, then revert again.

Hard invariant: never leave a mutated line in the tree. If a mutation+test sequence is interrupted, restore from git before continuing.

### 6. Optional log entry

If you tightened anything substantive (not just "ran the audit, all clean"), write one `[ch]` log entry to `features/$ARGUMENTS/log/<UTC-ISO-timestamp>-<your-repo>-tightened.dsl`. One short body: what categories of change you applied (e.g. "removed two unused params, filled a coverage gap in TokenRotator, verified mutation kills"). Skip if nothing changed.

### 7. Confirm

A short report — one short paragraph or a compact list, not a wall of text:

- Merge-base + N files in scope.
- Phase 1: <count> items flagged, <count> fixed.
- Phase 2: which languages were refactored, and via which mechanism (`/kotlin-refactor` vs inline).
- Phase 3: per-file coverage verdict (`sufficient` / `gap-filled` / `no-test-target`).
- Phase 4: per-file mutation result (`✓ caught` / `✗ gap-found-and-filled`).
- Final test status: green / red (and what's red).

No re-narration of every fix. The diff and the log entry are the record.

## Notes

- This command does not push, commit, or open a PR. Those are human-confirmed actions.
- If the human runs `/tighten` mid-feature (not at session end), that's fine — the command is read-only-on-shared-context except for the optional log entry in step 6.
- A second pass on the same branch is cheap: phases 1–3 are quick when there's nothing left to flag. Phase 4 reruns only the mutation step.
