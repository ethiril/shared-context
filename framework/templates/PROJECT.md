---
type: project-root
project: <project-id>
status: active
created_at: <YYYY-MM-DDTHH:MM:SSZ>
created_by: <repo>
summary: <one sentence describing the project's mission — ≤ 30 words>
---

# <Project Name>

This file is the **project identity** — mission, owners, north-star outcomes. Features under this project declare `project: <project-id>` in their `MISSION.md` frontmatter.

For the **agent-targeted index** (what entries exist, which features are active, how to look things up), see [`_index.md`](_index.md). That file is generated — do not edit by hand.

## Mission

<One paragraph. What is this project trying to achieve? Why does it exist as a coherent thing rather than a bag of features?>

## Owners

- `<repo>` — <area or surface they own>
- `<repo>` — <area or surface they own>

## North star

<One or two outcomes that determine whether the project is succeeding. Measurable where possible.>

## Architecture pillars

<Optional. List the non-obvious load-bearing decisions that shape the project. Each pillar should also exist as a `globals/<project>/architecture/<slug>.md` entry — this list is the human-readable summary.>

- `<slug>` — <one-line summary>
- `<slug>` — <one-line summary>

## Amendments

<!-- Append a dated one-liner here only when project mission, owners, or pillars genuinely change. Like MISSION.md amendments. -->
