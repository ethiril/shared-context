---
description: Check in on a feature — read incoming log entries directed at you, then plan responses
argument-hint: <feature-slug>
---

You are checking in on shared-context feature: **$ARGUMENTS**.

The user is bringing your attention to this feature because something is waiting for you — typically a log entry from another repo (an ask, an answer to one of your asks, a contract-change notification, an fyi, a blocker, or a pivot).

This is **not** a fresh-session resume. Don't re-read the whole protocol or every digest. Get to the inbox quickly.

## Steps

### 1. Quick orient (skip if already loaded this session)

- `features/$ARGUMENTS/MISSION.md` — feature identity.
- `features/$ARGUMENTS/orchestrator/` latest file — current state.

If you've already done these earlier in this session, skip them.

### 2. Find your read cursor

`features/$ARGUMENTS/cursors/<your-repo>/current.md` — note `last_log_read`. If `current.md` doesn't exist, fall back to the latest timestamped file in that folder (legacy). If no cursor at all, treat anything newer than the latest orchestrator snapshot's `at:` as new.

### 3. Pull your inbox

Read every file in `features/$ARGUMENTS/log/` where all of these hold:
- Filename's timestamp is newer than your `last_log_read` (or the snapshot, per step 2).
- `to:` frontmatter includes your repo, OR includes `[all]`.
- Frontmatter does NOT have `status: superseded`, and no sibling `*.superseded.md` tombstone exists.

If a `kind: pivot` is in the list, read it **first** — it may invalidate the rest.

### 4. Report — don't write yet

Output a compact table to the user. Sort blocking items (`ask`, `blocker`, `pivot`) to the top; conversational items (`question`, `fyi`) to the bottom.

```
| # | kind            | block? | from              | summary                                | suggested response       |
|---|-----------------|--------|-------------------|----------------------------------------|--------------------------|
| 1 | ask             | yes    | subscriptions-gw  | <summary>                              | answer (substantive)     |
| 2 | contract-change | yes    | app-gateway       | <summary>                              | ack + update consumer    |
| 3 | question        | no     | app-gateway       | <summary>                              | answer when convenient   |
| 4 | fyi             | no     | app-gateway       | <summary>                              | ack only                 |
```

Use the `summary:` frontmatter when available; fall back to the first sentence of the body. The `block?` column comes from the kind: `ask | blocker | pivot | contract-change` → yes; `question | fyi | change | answer | ticket-update` → no.

### 5. Ask for confirmation (tightly)

**If 1–4 inbox items:** call `AskUserQuestion` once with one question per inbox row. Each question header is the kind + sender (e.g. `"ask from subs-gateway"`). Options (≤4 per question, recommended first):

- **Answer** — write a substantive `kind: answer`. (Recommended for `ask` / `question` / `blocker`.)
- **Ack** — short `kind: ack` confirming you've absorbed it. (Recommended for `fyi` / `change` you're not touching.)
- **Change** — make the code change and write `kind: change` referencing the inbound. (Recommended when a `change` or `contract-change` affects your code.)
- **Skip** — defer; not writing anything this turn. (Use for non-blocking `question`s when heads-down.)

Set the **first** option to the recommended response per kind, append " (Recommended)" to its label.

**If ≥5 inbox items:** skip `AskUserQuestion` (it caps at 4 questions). Fall back to a one-line per-row text proposal and a single "go ahead / change anything?" prompt.

**Wait for the user's answers before writing anything.** The user may say "Other → redirect this to X" for any row — honour that.

### 6. Write the responses

For each option the user selected:

- **Answer** → write a `kind: answer` log entry. Frontmatter: `from: <self>`, `to: [<inbound's from>]`, `refs: [log/<inbound-filename>]`, `summary: <one sentence>`. Body: the actual answer (50–200 words; the lint hook will warn if longer).
- **Ack** → write a `kind: ack` log entry. Same frontmatter shape. Body: 1–3 sentences confirming you've absorbed it; flag anything that needs follow-up.
- **Change** → make the code change first, then write a `kind: change` (or `kind: contract-change` if you're publishing a new contract version) referencing the inbound.
- **Skip** → don't write anything for that row. The cursor write at step 7 will still advance `last_log_read` past the inbound, marking it as seen.

Special kinds:
- **ticket / ticket-update** → if you're the assignee, read `tickets/<slug>.md`, plan your work, then `Ack` with a one-line note. Don't restate the ticket content in the ack.
- **pivot** → you've already absorbed it at step 3. The right follow-up is `Change` describing what you're abandoning vs. continuing, and (if your code state shifted materially) a new status under `repos/<self>/`. The Ack option is wrong for pivots; surface that to the user if they pick it.

### 7. Update your cursor

After writing responses, overwrite `cursors/<self>/current.md` setting `last_log_read` to the latest log filename you processed (whether you answered it or skipped). This keeps the next `/check-in` cheap.

### 8. Wrap up

In one sentence, tell the user what you wrote and whether anything you saw deserves a fresh status snapshot (`repos/<self>/`) or a fresh digest. Don't write the digest yourself — that's `/handoff` territory.

## Soft budget

≤ 5k tokens of reads. The inbox should be small; if it isn't, you may have skipped a `/check-in` or `/handoff` cycle and should consider whether `/catch-up` is more appropriate.
