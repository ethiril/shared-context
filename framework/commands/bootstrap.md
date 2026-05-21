---
description: Bootstrap a new shared-context feature folder (4-phase workshop)
argument-hint: <feature-slug>
---

Bootstrap new feature **$ARGUMENTS** as a *workshop*: scaffold instantly, then walk the human through intake → scope-out → planning. Each phase commits to `MISSION.md` so a `/clear` mid-workshop doesn't lose progress.

**Format note (see README §7):** `log/`, `repos/`, `contracts/` use compact formats. Everything else (MISSION, decisions, digest, orchestrator, cursor) is YAML+body.

### Hard rules

- **Do not create `overview/`.** Deprecated.
- **Do not skip the orchestrator snapshot at the end of phase 4.** Until it exists, `/catch-up` and `/resume` fall back to a degraded path.
- **Detect resume-mid-bootstrap.** If `features/$ARGUMENTS/MISSION.md` already exists, read it and jump to the first phase whose section is still empty/placeholder. Don't re-do completed phases.

---

## Phase 1 — Scaffold (instant, no questions)

Do this immediately on invocation. No `AskUserQuestion`, no prose-with-the-user. Just file ops.

### 1a. Resolve root + framework version marker (one-time per repo)

**Resolve `<SHARED_CONTEXT_ROOT>`** in this order, stopping at the first hit:

1. Top-level `shared_context_root` in `~/.claude/settings.json` (written by `framework/bin/setup-claude.sh` on `apply`/`force`). This is the normal path.
2. Fallback for fresh clones: your repo's `CLAUDE.md` *"Cross-repo coordination lives at …"* line.

**Permissions live globally now.** The shared-context bundle (`Read`, `Write`, `Edit`, `Bash(node …/render-dashboard.mjs)`, `Bash(date -u *)`) is managed by `setup-claude.sh` in `~/.claude/settings.json` — do **not** add these to per-repo `.claude/settings.local.json`. If you find they're missing on this machine (you'll see permission prompts during this session), tell the user to run `framework/bin/setup-claude.sh` and choose `apply`.

**Framework version marker** — this is per-repo state. Open `.claude/settings.local.json` in your CWD and set top-level field `"shared_context_framework_version": 2`. Tells future `/resume` and `/catch-up` sessions in this repo that you've absorbed README §7 at v2.

Idempotent: skip if the marker is already present. If the file doesn't exist, create it with `{"shared_context_framework_version": 2}`.

### 1b. Scaffold folders + empty MISSION

```bash
mkdir -p features/$ARGUMENTS/{repos,contracts,decisions,digest,log,tickets,cursors,orchestrator}
cp framework/templates/MISSION.md features/$ARGUMENTS/MISSION.md
```

`log/` starts empty. MISSION.md has the template placeholders (`<One paragraph...>`, `<bullet>`, etc.) — those mark sections as not-yet-filled.

### 1c. Confirm and hand off to phase 2

One sentence: "Scaffolded `features/$ARGUMENTS/`. Now let's workshop it." Then go to phase 2.

---

## Phase 2 — Intake (long-form, no suggestions)

**Critical:** ask ONE open question and let the human answer at length. Do NOT prompt with suggestions, examples of feature types, or multiple-choice options. The goal is to hear *their* framing first, unbiased.

### 2a. Ask

Output to the user, verbatim or close:

> Tell me what this feature is. Walk me through it — what it does, what it touches, why it matters now. Don't worry about structure or scope yet; just lay it out.

**Do NOT use `AskUserQuestion` here.** It forces options; we want prose. Just ask in chat and wait.

**Do NOT suggest** ("Is it an API change? A new UI?...") — that anchors the user on your framing.

### 2b. Wait for the long-form answer

The human will reply with prose. Read it carefully. Don't summarise back yet.

### 2c. Commit `## Goal` to MISSION.md

Once the human has given you a substantive answer (≥ 2-3 sentences, you understand the thrust):

- Distil their answer into a `## Goal` paragraph (one paragraph, their words wherever possible).
- Edit `features/$ARGUMENTS/MISSION.md` — replace the `<One paragraph...>` placeholder under `## Goal` with your distillation. Also fill the `created_at` and `created_by` frontmatter fields.
- Tell the user: "Captured the goal. Read it back to me — does this match what you said?" Show the paragraph inline.
- If they correct it, re-edit. Then go to phase 3.

---

## Phase 3 — Scope-out (prodding questions based on phase 2)

Now you ask probing questions *grounded in what they said*. Goal: surface assumptions, edges, and the end-state.

### 3a. Generate the prodding question set

Based on the phase 2 intake, draft 3–6 questions that:

- **Probe what they explicitly considered** ("You mentioned X — is Y in scope too, or out?").
- **Probe what they may not have considered** ("Did you think about error/empty-state behaviour for X?", "What happens to existing data when this ships?").
- **Surface the end-state** ("When this is done, what does a user/operator see/do?", "How will you know it's working?").
- **Pin success criteria** ("What's the minimum that has to be true for you to call this shipped?").

Avoid leading questions. Avoid generic "is this MVP?" framings unless their answer warrants it.

### 3b. Ask them

For 1–4 questions: use a single `AskUserQuestion` call, one question per row, with sensible options derived from their phase 2 intake plus an "Other" escape.

For > 4 questions: ask in plain prose, numbered, and let them answer freeform. Then iterate as needed.

### 3c. Iterate

The first round of answers will reveal more. Ask follow-ups. Don't push to closure prematurely — the point of this phase is depth.

### 3d. Commit `## Scope` + `## Success criteria` to MISSION.md

When the picture is firm:

- Replace the `**In** / **Out**` bullet placeholders under `## Scope` with concrete in/out lines from the conversation.
- Replace the `## Success criteria` placeholders with measurable outcomes.
- Show the user the diff: "Here's what I'm committing — confirm or correct."
- On confirm, save. Go to phase 4.

---

## Phase 4 — Planning (architecture back-and-forth)

The conversational phase. Goal: flesh out *how* this gets built across repos, surface architectural choices, identify contracts that will need to exist.

### 4a. Open the discussion

Prompt the user something like:

> Now let's plan how this gets built. Which repos do you think need to participate? What APIs or contracts do you see emerging? Anything you're not sure how to approach?

Let them lead. Don't impose a decomposition.

### 4b. Iterate on architecture

Things to probe (when relevant — not a checklist to march through):

- **Repo decomposition** — which existing repos touch this; whether anything new needs to be stood up.
- **Contract surfaces** — what APIs/queues/jobs need to exist between repos. Doesn't need a spec yet, just identification.
- **Decision points** — known choices that need an ADR (e.g. "JWT vs session", "polling vs push").
- **Unknowns** — what they're genuinely unsure about. These become initial `[q]` log entries or `decisions/` placeholders.
- **Sequencing** — what has to land before what.

Use `AskUserQuestion` for discrete choices when they arise. Most of this phase is plain chat.

### 4c. Commit `## Repos involved` to MISSION.md

Once you've agreed on participating repos:

- Fill `## Repos involved` with `<repo> — <role in this feature>` lines.
- Show the user the now-complete MISSION.md.
- Ask: "Ready to announce the feature and let the other repos join? Or more to workshop?"

### 4d. Loop or proceed

If they have more to refine → loop back into 4b. If ready → continue to 4e.

### 4e. Capture unknowns as `[q]` log entries

For each genuine unknown raised during 4b that concerns another repo (or all repos), write one DSL log file per question — single-concern rule, don't bundle.

Path: `features/$ARGUMENTS/log/<UTC-ISO-timestamp>-<your-repo>-q-<short-slug>.dsl`. Grammar:

```
<your-repo> > <target-repo-or-all> [q] @<iso-with-colons>: <one-line question> | refs: MISSION.md | <body — 15-40 words of context>
```

- `<target-repo-or-all>` — specific repo if the question is theirs to answer; `all` if any participant could; comma-list if narrowly scoped to a few.
- Use `[q]` (not `[fy]`). Blocking tone if you need an answer before progressing; non-blocking if it's "while you're here".
- Don't write `[q]` for things only you can decide — those belong in `decisions/` as ADR placeholders.

These are the questions `/join` will surface and answer in joining repos. If there are no cross-repo unknowns, skip — the new joiners will simply have nothing to ack.

---

## Wrap-up — Announce + checkpoint

Only runs after phase 4 has produced a complete MISSION.md and the user has confirmed they're ready.

### W1. First positional status

Path: `features/$ARGUMENTS/repos/<your-repo>/<UTC-ISO-timestamp>.positional`. Schema (9 fields, 8 pipes — see README §7 → repo status):

```
repo|at|summary|current_goal|done|next|blocked_on|contracts_in_play|open_questions
```

Bootstrap-state line (everything empty but `summary` + `current_goal`):

```
<repo>|<iso>|Bootstrapped; awaiting kickoff|<one-sentence goal>||||[]|[]
```

Eyeball the pipe count: 8 pipes, no more.

### W2. `[fy]` announcement

One file at `features/$ARGUMENTS/log/<UTC-ISO-timestamp>-<your-repo>-bootstrap.dsl`. Grammar:

```
<your-repo> > all [fy] @<iso-with-colons>: Feature bootstrapped — <one-line invitation>. | refs: MISSION.md, repos/<your-repo>/<iso>.positional | <body — 15-40 words MAX>
```

**Don't recap MISSION** — `refs:` points at it. Body is for *delta* only: which other repos should `/join` (named), time-sensitive context, single critical gotcha. Leave empty if nothing.

### W3. First orchestrator snapshot

You temporarily wear the orchestrator hat for this single write — your repo identity stays the same everywhere else.

Path: `features/$ARGUMENTS/orchestrator/<UTC-ISO-timestamp>-orchestrator.md`. Frontmatter: `{type: orchestrator-snapshot, author: orchestrator, at: <iso-with-colons>, status: on-track, trigger: bootstrap, summary: <one sentence, ≤ 30 words>}`.

Body ≤ 150 words: `## Headline` paragraph saying "Feature bootstrapped — awaiting joins from <named repos>"; `## Where each repo stands` listing the founding repo + expected joiners as "(joining)"; `## Open for the human` = `Nothing — heads-down on initial setup.`. Skip "What shipped" and "Decisions made" — nothing has yet.

### W4. Render the dashboard

```bash
node framework/bin/render-dashboard.mjs
```

Pure aggregation, no LLM cost.

### W5. Confirm

Report:
- Paths scaffolded.
- Repos that should run `/join $ARGUMENTS` next.
- This is the last `/bootstrap`; future sessions use `/resume $ARGUMENTS`.
