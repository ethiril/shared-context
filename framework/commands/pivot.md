---
description: Record a direction change on a shared-context feature
argument-hint: <feature-slug> <one-line reason>
---

You are pivoting shared-context feature. Argument: **$ARGUMENTS**.

The first whitespace-separated token in $ARGUMENTS is the feature slug; the rest is the reason.

Follow the pivot protocol from your shared-context folder's `framework/README.md` §4.2. (Your repo's `CLAUDE.md` declares where shared-context lives.)

Three writes:

### 1. Pivot log entry

Write `features/<slug>/log/<UTC-ISO-timestamp>-<your-repo>-pivot.md`:

```yaml
---
type: log
kind: pivot
from: <your-repo>
at: <ISO>
to: [all]
summary: One sentence — the new direction.
refs: [<any new contract or decision files>]
supersedes: all-prior          # or a list of specific filenames being superseded
---
```

Body: explain WHY we're pivoting, what's still valid, what to ignore from before, and what changes for whom. The reason from $ARGUMENTS is your starting point — expand it into context.

### 2. Tombstones for retired entries

For each decision or contract that the pivot retires, write a sibling tombstone:

Filename: `<folder>/<original-stem>.superseded.md`

```yaml
---
type: tombstone
original: <original-filename>
superseded_by: <pivot-log-filename or new-decision/contract-filename>
at: <ISO>
---
```

If your pivot uses `supersedes: all-prior`, you only need tombstones on the decisions and contracts you're explicitly retiring — pivots take care of logs and digests at read-time via the protocol's "anything older than the pivot is suspect" rule.

### 3. Fresh digest

Write `features/<slug>/digest/<UTC-ISO-timestamp>-<your-repo>.md` reflecting the post-pivot reality. The digest write triggers the orchestrator hook → new snapshot → new `dashboard.html`.

After all three, summarise what you did and call out anything you weren't sure about superseding.
