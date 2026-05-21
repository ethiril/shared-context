---
description: Add or update one entry in globals/<project>/ — a shared architecture decision, convention, or glossary term
argument-hint: <project> <category> <slug>
model: claude-opus-4-7
---

Add a global entry for project **$ARGUMENTS**. The argument is three whitespace-separated tokens: `<project> <category> <slug>`. Example: `/global-add dollargps architecture auth-token-rotation`.

Categories: `architecture`, `conventions`, `glossary`. Reject anything else.

### Hard rules

- **One concept per entry.** Don't bundle a convention and a glossary term in the same file. Split.
- **Keywords drive discovery.** Be liberal — every term an agent might search for. Cap at ~10 to keep `_index.md` tight.
- **No duplicate writes.** If the slug already exists, treat this as an *update* (read first, ask whether to amend or supersede).
- **Don't pre-load the project's other entries.** Read `_index.md` only — that's the whole point of having one.

### 1. Validate args + sanity-check project

Parse `$ARGUMENTS` into `<project>`, `<category>`, `<slug>`. If any are missing, ask the human via `AskUserQuestion`.

Check `globals/<project>/PROJECT.md` exists. If not: tell the human the project doesn't exist yet and ask whether to bootstrap one (creating `globals/<project>/{PROJECT.md, architecture/, conventions/, glossary/}` from `framework/templates/PROJECT.md`). Don't proceed without their confirmation — project creation is a deliberate act.

Read `globals/<project>/_index.md` (cheap). Note: do **not** read any individual entry files yet.

### 2. Slug collision check

Look for `globals/<project>/<category>/<slug>.md`. If it exists:

- Read it now.
- Ask via `AskUserQuestion`: amend in place, supersede (write a new file that points at the old slug via `supersedes:`), or cancel.
- If amend: edit-in-place, update `summary`, `keywords`, body. Do not change `created_at`. Skip to step 5.
- If supersede: continue to step 3 with the new entry, and ensure the new entry's frontmatter has `supersedes: <old-slug>`.

### 3. Gather entry content

Ask the human four things (in plain prose, not `AskUserQuestion`):

1. **Summary** — one sentence ≤ 30 words. Specific. Used in `_index.md`.
2. **Keywords** — comma-separated. Liberal but bounded (~3–10). Every term an agent might search for.
3. **Body** — the actual entry. 50–300 words is the sweet spot; longer is fine if the content earns it. Markdown allowed.
4. **Supersedes** *(only if step 2 told you to)* — confirm the slug being retired.

For glossary entries: body can be much shorter (one paragraph max). The summary often *is* the body.

### 4. Write the file

Path: `globals/<project>/<category>/<slug>.md`.

```yaml
---
type: global-entry
project: <project>
category: <category>
slug: <slug>
summary: <one sentence>
keywords: [k1, k2, k3]
status: active
created_at: <UTC-ISO-timestamp with colons>
created_by: <your-repo>
# Optional:
# supersedes: <prior-slug>
---

# <Title — usually a noun phrase, not a sentence>

<body>
```

Use the canonical timestamp format: `date -u +"%Y-%m-%dT%H:%M:%SZ"`. The `created_by:` field is your repo identity (from `AGENTS.md`, not `orchestrator`).

### 5. Render

```bash
node framework/bin/render-dashboard.mjs
```

Regenerates `globals/<project>/_index.md` so the new entry shows up immediately.

### 6. Optional: log it on a feature

If this entry was prompted by work on a specific feature, drop a one-line `[fy]` log entry on that feature pointing at the new global. Path: `features/<slug>/log/<UTC-ISO-timestamp>-<your-repo>-fy-globalref-<slug>.dsl`. Body: `Added globals/<project>/<category>/<slug>.md — <one-line why it matters here>`.

Skip if the entry stands alone.

### 7. Confirm

One sentence: which file you wrote, whether it amends/supersedes, and any feature log entry. Don't re-narrate the body.

## Notes

- Project bootstrap is heavier than entry-add — if you find yourself running `/global-add` for the very first entry on a brand-new project, expect to spend a few minutes on `PROJECT.md` content before writing the entry.
- Retired/superseded entries stay on disk; `_index.md` filters them by default. Use `/audit` for full-history reads.
- This command does **not** edit any feature's `MISSION.md`. Associating a feature with a project is a separate edit (just add `project: <id>` to MISSION frontmatter).
