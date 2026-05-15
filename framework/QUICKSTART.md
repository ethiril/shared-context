# Quickstart (for you, the human orchestrator)

The detailed protocol agents follow is in `README.md`. This file is just the parts you need to run the show.

---

## Workflow at a glance

1. **Bootstrap once per feature** — see "Recipes" below.
2. **Open Claude Code in each repo.** Brief each agent:
   > *"You're on feature `<slug>`. Read `<shared-context>/framework/README.md` and `<shared-context>/AGENTS.md`, then resume."*
   > (Each repo's `CLAUDE.md` declares the absolute path to your shared-context folder — see the "Wire each repo to point here" recipe below.)
3. **Let agents work** — they append logs, contracts, decisions, and status snapshots to `features/<slug>/`.
4. **Before `/clear`**, ask the agent:
   > *"Write a digest and a cursor."*
5. **After `/clear`** (or a new session):
   > *"Quick resume on feature `<slug>`."*

That's the whole loop.

---

## How context splits per feature

```
features/
├── auth-revamp/         ← one feature, fully isolated
└── payment-rewrite/     ← agents on this never see auth-revamp state
```

Each feature folder is a self-contained world. Logs, contracts, digests, cursors — all scoped to the feature. Cross-feature sharing means **copy, don't link**. One agent can rotate between features in a single session; just name the current feature before each batch of work.

---

## Tips for getting the most out of this

- **Name the feature explicitly at every session start.** Don't let the agent guess.
- **Ask for a digest at milestones**, not only at session end. Writing one mid-session pays back 10× on the next resume.
- **Use `/clear` between features**, not within. Within a feature, the digest carries continuity. Across features, clearing prevents cross-contamination.
- **Say "pivot" out loud when direction changes.** Trigger phrase: *"We're pivoting. Write a `kind: pivot` log entry, then a fresh digest."* The keyword routes the agent into the right protocol.
- **Confirm the checkpoint after `/clear`.** First message: *"Tell me which digest you read and which contract versions you're synced against."* Catches stale-state bugs in 5 seconds.
- **Don't tail `log/` yourself.** Ask any agent to read the latest digest and summarize.
- **Keep `AGENTS.md` current.** A new repo has no identity in this system until it's listed there.
- **One agent per repo at a time.** Multiple agents across *different* repos is the whole point. Multiple agents inside the *same* repo races on its `repos/<self>/` writes.
- **Don't hand-edit anything in `features/*`.** Append-only is structurally enforced for agents but not for humans — and breaking it desyncs everyone.

---

## Recipes

### Bootstrap a feature
From the shared-context repo root:
```bash
SLUG=<feature-slug>
mkdir -p features/$SLUG/{overview,repos,contracts,decisions,digest,log,cursors,orchestrator}
cp framework/templates/MISSION.md features/$SLUG/MISSION.md
```
Then in any agent:
> *"Write the initial overview for feature `<slug>`. Goal: …, scope: …, repos involved: …, success criteria: …"*

### Pivot a feature
> *"We're pivoting because <reason>. Drop a `kind: pivot` log entry with `supersedes: all-prior` (or a list of filenames), then a new contract version if relevant, then a fresh digest reflecting the new direction."*

### Resume cleanly after `/clear`
> *"You're on feature `<slug>`. Quick resume per README §4.1."*

### Wire each repo to point here
In each repo's `CLAUDE.md`, add one line with the absolute path to your shared-context folder:
> Cross-repo coordination lives at `<absolute path to your shared-context folder>`. For any multi-repo feature, read its `framework/README.md` and its root `AGENTS.md` before starting work.

That's all the repo needs; the shared-context folder carries the rest.
