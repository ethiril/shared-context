---
type: ticket
slug: <kebab-slug>
title: <one-line title>
author: <repo who scoped it>
assignee: <repo who executes; or list for shared work>
at: <ISO with colons — creation>
last_updated: <ISO with colons — bump on every edit>
status: open
summary: <one sentence ≤30 words — what this ticket asks for>
refs:
  - <related contract / decision / log filenames>
---

# <title>

## Context

What's the situation? Why is this ticket being written now? Link to the contract or decision that triggers the work.

## Scope

### In
- Bullet what must land for this ticket to be considered done.

### Out
- Bullet what's explicitly *not* in this ticket — keeps follow-ups grep-able.

## Implementation notes

File-by-file or step-by-step plan, sized to the work. Mention any non-obvious constraints (DTO drift, ordering of deploys, feature flags, etc.). It's fine for this section to be long — the lint hook does not check ticket word counts.

## Acceptance criteria

How the assignee + reviewer know the ticket is done. Concrete: "endpoint X returns Y on input Z," not "feature works."

## Open questions

- Items the assignee should resolve with the author or human before shipping.

## Updates

Append a one-line entry per material change (don't rewrite history):

- YYYY-MM-DD — <repo>: <one-line update>. See `log/<update-filename>.md`.
