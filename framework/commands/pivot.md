---
description: Record a direction change on a shared-context feature
argument-hint: <feature-slug> <one-line reason>
---

You are pivoting shared-context feature. Argument: **$ARGUMENTS**.

The first whitespace-separated token in $ARGUMENTS is the feature slug; the rest is the reason.

Follow the pivot protocol from your shared-context folder's `framework/README.md` §4.2. (Your repo's `CLAUDE.md` declares where shared-context lives.)

A pivot has 3 mandatory writes (log + tombstones + digest) and 1 conditional write (replacement-placeholder decisions, when the user asks for them). The interactive prompts below keep the human in the loop on what gets retired and what (if anything) replaces it.

### 1. Scan for tombstone candidates

Read:
- `features/<slug>/decisions/` (active only — skip `status: superseded` and tombstoned siblings)
- `features/<slug>/contracts/<api>/` latest per API (skip superseded + skipped)
- The pivot reason from $ARGUMENTS — what does it imply is now wrong?

Build a candidate list of decisions and active contract versions whose premise the pivot invalidates. Conservative bias: include anything plausibly affected; the user will deselect what should stay.

### 2. Confirm retirement (AskUserQuestion)

If you found 1–4 candidates, call `AskUserQuestion` once with one question per candidate. Header: short label like `"ADR: attribution-on-renewal"`. Options (≤4, recommended first):

- **Tombstone now** — retire this candidate with a `.superseded.md` sibling. (Recommended when the pivot reason clearly invalidates it.)
- **Keep active** — the pivot doesn't actually retire this. (Recommended when in doubt.)
- **Defer** — leave for a follow-up pivot; flag it in the pivot log but don't tombstone yet.

If >4 candidates, list them as a numbered table and ask one open-ended "which to tombstone?" prompt instead — note in your output that the cap is 4 questions per AskUserQuestion call.

### 3. Confirm replacements (AskUserQuestion)

For each candidate the user chose to **Tombstone now**, the retired artifact has a successor question: what replaces it?

If 1–4 tombstoned items, call `AskUserQuestion` once with one question per item. Header: `"Replace <item-name>"`. Options:

- **Placeholder ADR now** — write a stub `decisions/<iso>-<placeholder-slug>.md` with `status: proposed` capturing the new direction at sentence-level granularity. (Recommended when the new shape is known but not designed in detail.)
- **Later, separately** — note in the pivot log body that a replacement is owed; don't write one now. (Recommended when the new shape is still being figured out.)
- **No replacement** — the pivot direction is *away from* this, with nothing taking its place. (Recommended for genuinely retired ideas.)

The "placeholder ADR now" path matters: it closes the gap voucher-v2 had where `attribution-preserved-on-renewal` was tombstoned ~4 hours before its replacement was written, leaving downstream schema work unclear about the new shape.

### 4. Write the pivot log

`features/<slug>/log/<UTC-ISO-timestamp>-<your-repo>-pivot.md`:

```yaml
---
type: log
kind: pivot
from: <your-repo>
at: <ISO>
to: [all]
summary: One sentence — the new direction.
refs: [<any new contract or decision files written in step 5>]
supersedes: all-prior          # or a list of specific filenames being superseded
---
```

Body: explain WHY we're pivoting, what's still valid, what to ignore from before, and what changes for whom. The reason from $ARGUMENTS is your starting point — expand it into context.

For each tombstoned-with-no-replacement and each tombstoned-with-deferred-replacement candidate, add a "what's owed" bullet in the body so future readers know it's an open thread.

Body target: 100–250 words. Lint hook caps at 200 (log budget); `# allow-oversize: pivot body covers N retired items` is acceptable here if you need it.

### 5. Tombstones + placeholder decisions

For each item the user chose to **Tombstone now**, write a sibling:

Filename: `<folder>/<original-stem>.superseded.md`

```yaml
---
type: tombstone
original: <original-filename>
superseded_by: <pivot-log-filename or placeholder-decision-filename>
at: <ISO>
---
```

For each item the user chose **Placeholder ADR now**, write `decisions/<iso>-<placeholder-slug>.md`:

```yaml
---
type: decision
title: <one-line title — the new direction at sentence-level>
author: <your-repo>
at: <ISO>
summary: One sentence — the rule and its scope.
status: proposed
affects: [<api or area>]
supersedes: <the tombstoned decision's filename>
---
```

Body: 50–150 words. State the new direction in ≤3 bullets. Mark it `status: proposed` — the team will accept/refine after the pivot lands and the shape gets designed.

### 6. Fresh digest

Write `features/<slug>/digest/<UTC-ISO-timestamp>-<your-repo>.md` reflecting the post-pivot reality.

### 7. Wrap up

Summarise in 2–3 lines: what you tombstoned, what placeholders you wrote (or what's owed), and the new direction's headline. Don't run `/refresh` — the user can do that when they want the dashboard re-synthesised.
