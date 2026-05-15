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

`features/$ARGUMENTS/cursors/<your-repo>/` latest file. Note `last_log_read`. If no cursor exists, treat anything newer than the latest orchestrator snapshot's `at:` as new.

### 3. Pull your inbox

Read every file in `features/$ARGUMENTS/log/` where all of these hold:
- Filename's timestamp is newer than your `last_log_read` (or the snapshot, per step 2).
- `to:` frontmatter includes your repo, OR includes `[all]`.
- Frontmatter does NOT have `status: superseded`, and no sibling `*.superseded.md` tombstone exists.

If a `kind: pivot` is in the list, read it **first** — it may invalidate the rest.

### 4. Report — don't write yet

Output a compact table to the user:

```
| # | kind          | from              | summary                                | suggested response       |
|---|---------------|-------------------|----------------------------------------|--------------------------|
| 1 | ask           | subscriptions-gw  | <summary from frontmatter>             | answer (substantive)     |
| 2 | contract-change | app-gateway     | <summary>                              | ack + update consumer    |
| 3 | fyi           | app-gateway       | <summary>                              | ack only                 |
```

Use the `summary:` frontmatter when available; fall back to the first sentence of the body.

Then propose what you'd do for each — concrete actions, not vague gestures. **Wait for the user to confirm before writing anything.**

### 5. On the user's go-ahead

For each item the user approves:

- **ask** → write a `kind: answer` log entry. Frontmatter: `from: <self>`, `to: [<asker>]`, `refs: [log/<inbound-filename>]`, `summary: <one sentence>`. Body: the actual answer.
- **change / contract-change** → if it affects your code, make the change and write a `kind: change` (or `kind: contract-change` if you're publishing a new contract version) referencing the inbound. If it doesn't, write a `kind: ack` to confirm you've absorbed it.
- **fyi** → usually a `kind: ack` is enough.
- **blocker** → if you can unblock, write a `kind: answer` describing how. If not, escalate to the user.
- **pivot** → don't ack mechanically; you've already absorbed it at step 3. Your follow-up is to write a `kind: change` describing what you're abandoning vs. continuing, and (if your code state shifted materially) a new status under `repos/<self>/`.

The user may say "redirect this one" or "skip" for any row. Honour that.

### 6. Update your cursor

After writing responses, drop a fresh `cursors/<self>/<UTC-ISO-timestamp>.md` setting `last_log_read` to the latest log filename you processed. This keeps the next `/check-in` cheap.

### 7. Wrap up

In one sentence, tell the user what you wrote and whether anything you saw deserves a fresh status snapshot (`repos/<self>/`) or a fresh digest. Don't write the digest yourself — that's `/handoff` territory.

## Soft budget

≤ 5k tokens of reads. The inbox should be small; if it isn't, you may have skipped a `/check-in` or `/handoff` cycle and should consider whether `/catch-up` is more appropriate.
