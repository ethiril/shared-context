---
description: Record a direction change on a shared-context feature
argument-hint: <feature-slug> <one-line reason>
---

Pivot feature. `$ARGUMENTS` = `<slug> <reason>` (first token is slug, rest is reason).

Pivot writes are listed in `framework/README.md` §5 (row "Direction is changing"). 3 mandatory writes (log + tombstones + digest) + 1 conditional (placeholder decisions). Interactive prompts keep the human in the loop on retire/replace.

### 1. Scan for tombstone candidates

Read:
- `features/<slug>/decisions/` (active only — skip `status: superseded` and tombstoned).
- `features/<slug>/contracts/<api>/` latest per API (skip superseded).
- Pivot reason from `$ARGUMENTS` — what does it invalidate?

Build a candidate list. **Conservative bias**: include anything plausibly affected; user deselects what should stay.

### 2. Confirm retirement (AskUserQuestion)

If 1–4 candidates: call `AskUserQuestion` once, one question per candidate. Header: `"ADR: <slug>"`. Options (≤ 4, recommended first):

- **Tombstone now** — write `.superseded.md` sibling. *Recommended when* pivot clearly invalidates.
- **Keep active** — pivot doesn't actually retire this. *Recommended when in doubt.*
- **Defer** — leave for follow-up pivot; flag in pivot log but don't tombstone yet.

If > 4 candidates: numbered table + one open-ended "which to tombstone?" prompt (note the 4-question cap).

### 3. Confirm replacements (AskUserQuestion)

For each **Tombstone now** item, ask what replaces it. 1–4 items: one question per item. Header: `"Replace <item-name>"`. Options:

- **Placeholder ADR now** — stub `decisions/<iso>-<slug>.md` with `status: proposed`, sentence-level direction. *Recommended when* new shape is known but not designed.
- **Later, separately** — note replacement is owed in pivot log; don't write now. *Recommended when* new shape still being figured out.
- **No replacement** — pivot direction is *away from* this with nothing taking its place. *Recommended for* genuinely retired ideas.

The "placeholder ADR now" path closes the gap where a tombstone lands hours before its replacement, leaving downstream work unclear.

### 4. Pivot log

Write a new file `features/<slug>/log/<UTC-ISO-timestamp>-<your-repo>-pivot-<slug>.dsl` (single DSL line):

```
<your-repo> > all [pv] @<ISO>: One sentence — the new direction. | refs: <any new contract or decision files written in step 5> | supersedes: all-prior | <body — see below>
```

`supersedes:` may be `all-prior`, a comma-separated list of prior log filenames, or `@at:` timestamps to retire specific entries. The trailing body section is plain prose after the final `|` (100–250 words; lint caps at 200 — append `# allow-oversize: pivot body covers N retired items` at the end of the line if you need to exceed it).

Body content: why pivoting, what's still valid, what to ignore from before, what changes for whom. For each tombstoned-with-no-replacement or deferred-replacement, add a "what's owed" bullet (use `~` or `;` inside the body since `|` is the field separator).

### 5. Tombstones + placeholders

**Each "Tombstone now" item:**

`<folder>/<original-stem>.superseded.md`:

```yaml
---
type: tombstone
original: <original-filename>
superseded_by: <pivot-log-filename or placeholder-decision-filename>
at: <ISO>
---
```

**Each "Placeholder ADR now" item:**

`decisions/<iso>-<placeholder-slug>.md`:

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

Body 50–150 words. ≤ 3 bullets stating the new direction. `status: proposed` — team accepts/refines after the pivot lands.

### 6. Fresh digest

`features/<slug>/digest/<UTC-ISO-timestamp>-<your-repo>.md` reflecting the post-pivot reality.

### 7. Wrap up

2–3 lines: what you tombstoned, what placeholders you wrote (or what's owed), and the new direction's headline. Don't run `/refresh` — user does that when they want the dashboard re-synthesised.
