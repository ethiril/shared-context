---
description: Check in on a feature — read incoming log entries directed at you, then plan responses
argument-hint: <feature-slug>
---

Check in on feature **$ARGUMENTS** — process inbound log entries.

**Not a fresh-session resume.** Get to the inbox quickly.

### 1. Quick orient (skip if already loaded)

- `features/$ARGUMENTS/MISSION.md`
- `features/$ARGUMENTS/orchestrator/` latest file

### 2. Find read cursor

`features/$ARGUMENTS/cursors/<your-repo>/current.md` → `last_log_read`. Legacy fallback: latest timestamped file in that folder. No cursor at all: treat everything newer than the latest snapshot's `at:` as new.

### 3. Pull inbox

Read `features/$ARGUMENTS/log/log.dsl`. Each non-empty line is one event (`from > to [kind] @at: summary | …`). An event is in your inbox where **all** hold:

- `at` timestamp newer than `last_log_read` (or snapshot `at`).
- `to` includes your repo OR is `all`.
- Not retired by a later `[pv]` line's `supersedes: all-prior` or explicit list.

If a `[pv]` (pivot) line is in the list, read it **first** — may invalidate the rest.

Legacy md+YAML files under `log/` are still read for backwards compat — apply the same filters (frontmatter `to`, filename timestamp).

### 4. Report — don't write yet

Compact table. Block-worthy kinds (`ask`, `blocker`, `pivot`, `contract-change`) sort to top; conversational (`question`, `fyi`) to bottom.

```
| # | kind            | block? | from              | summary                | suggested response       |
|---|-----------------|--------|-------------------|------------------------|--------------------------|
| 1 | ask             | yes    | subscriptions-gw  | <summary>              | answer (substantive)     |
| 2 | contract-change | yes    | app-gateway       | <summary>              | ack + update consumer    |
| 3 | question        | no     | app-gateway       | <summary>              | answer when convenient   |
| 4 | fyi             | no     | app-gateway       | <summary>              | ack only                 |
```

Summary from the DSL line's `summary` section (or YAML `summary:` for legacy entries). `block?` from kind: `q`(ask) / `bl`(blocker) / `pv`(pivot) / `cc`(contract-change) → yes; `q`(question, judged by tone) / `fy` / `ch` / `a` / `tk` → no.

### 5. Confirm tightly

**1–4 inbox items:** call `AskUserQuestion` once with one question per row. Header: kind + sender (e.g. `"ask from subs-gateway"`). Options (≤ 4, recommended first):

- **Answer** — substantive `[a]` (answer) line. *Recommended for* `q` (ask) / `q` (question) / `bl` (blocker).
- **Ack** — short `[ak]` line confirming absorption. *Recommended for* `fy` / `ch` you're not touching.
- **Change** — make the code change, write `[ch]` line referencing the inbound. *Recommended when* a `ch` / `cc` affects your code.
- **Skip** — defer; nothing written this turn. *Use for* non-blocking `q` (question)s when heads-down.

First option's label gets " (Recommended)" appended per kind.

**≥ 5 items:** skip `AskUserQuestion` (caps at 4). One-line proposal per row, then a single "go ahead?" prompt.

**Wait for answers before writing.** "Other → redirect to X" overrides — honour it.

### 6. Write responses

Append one line per response to `features/$ARGUMENTS/log/log.dsl`:

- **Answer** → kind `[a]`. Shape: `<self> > <inbound-from> [a] @<ISO>: <one-sentence summary> | refs: <inbound-event-timestamp> | <body 50–200 words>`.
- **Ack** → kind `[ak]`. Same shape; body 1–3 sentences; flag follow-ups.
- **Change** → make the code change first, then `[ch]` (or `[cc]` if publishing a new contract version) referencing the inbound.
- **Skip** → don't write; step 7 still advances cursor past the inbound.

Special kinds:
- **ticket / ticket-update** — if you're the assignee, read `tickets/<slug>.md`, plan work, then **Ack** (`[ak]`) with a one-line note (don't restate ticket).
- **pivot** — already absorbed in step 3. Right follow-up is **Change** (`[ch]`, what you're abandoning vs. continuing) plus a fresh `repos/<self>/<iso>.positional` if code state shifted. Ack is wrong for pivots — flag if user picked it.

### 7. Update cursor

Overwrite `cursors/<self>/current.md`: `last_log_read` = latest log filename processed (whether answered or skipped). Keeps next `/check-in` cheap.

### 8. Wrap up

One sentence: what you wrote and whether anything deserves a fresh `repos/<self>/` status or a fresh digest. Don't write the digest — that's `/handoff`.

**Budget:** ≤ 5k tokens. If inbox is bigger, consider whether `/catch-up` fits better.
