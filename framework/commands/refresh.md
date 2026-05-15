---
description: Manually refresh Mission Control for a feature (orchestrator + dashboard + index)
argument-hint: <feature-slug>
---

You are manually invoking the orchestrator for shared-context feature: **$ARGUMENTS**.

This is what `/refresh` does — equivalent to what the digest hook normally triggers automatically. Use it when:
- You want the human dashboard updated before you write a digest.
- You're testing the orchestrator output.
- A previous orchestrator run failed and you want to retry.

(Your repo's `CLAUDE.md` declares the absolute path to your shared-context folder.)

If you are NOT the orchestrator (your CWD is a repo, not `shared-context`):

> Stop. Run this instead from a terminal (the user can paste this — substitute the absolute path to their shared-context folder for `$SHARED_CONTEXT_ROOT`):
>
> ```
> bash "$SHARED_CONTEXT_ROOT/framework/bin/hook-orchestrate.sh" \
>   <<< "{\"tool_input\":{\"file_path\":\"$SHARED_CONTEXT_ROOT/features/$ARGUMENTS/digest/MANUAL-REFRESH\"}}"
> ```
>
> Or ask the orchestrator session directly.

If you ARE the orchestrator (CWD = the shared-context repo root):

1. Read `framework/orchestrator/brief.md` for your full role definition.
2. Read the inputs for feature `$ARGUMENTS` per the brief's "What you read" section.
3. Write `features/$ARGUMENTS/orchestrator/<UTC-ISO-timestamp>-orchestrator.md` per the snapshot format in `framework/CONVENTIONS.md`. Set `trigger: manual` in frontmatter.
4. Run `node framework/bin/render-dashboard.mjs` to refresh `dashboard.html` and the per-feature `_index.md`.

After writing, confirm to me what state you captured and any "Open for the human" items you surfaced.
