# Agent Roster

Maps each repo to its identity in this shared-context folder. When an agent starts a session, it finds its CWD in the table below to learn what `<repo>` value to use in filenames and frontmatter.

**Keep this list authoritative.** When a new repo joins the collaboration, add a row.

> This file is a **template**. Copy it to `AGENTS.md` at the shared-context repo root and fill in your own roster. Your `AGENTS.md` is the canonical roster; this template is just the schema.

---

## Roster

| Repo identity      | CWD (absolute path)                       | Role / scope                                                                                                       |
|--------------------|-------------------------------------------|--------------------------------------------------------------------------------------------------------------------|
| `<repo-a>`         | `/absolute/path/to/<repo-a>`              | One-line description of what this repo owns in the collaboration.                                                  |
| `<repo-b>`         | `/absolute/path/to/<repo-b>`              | One-line description.                                                                                              |
| `orchestrator`     | `/absolute/path/to/shared-context`        | Synthesises human-readable snapshots in `features/<slug>/orchestrator/` and triggers the dashboard render. Never writes to repo-owned folders. See [`framework/orchestrator/brief.md`](./orchestrator/brief.md). |

---

## How to add a repo

1. Append a new row above with the repo's identity, CWD, and a one-line role description.
2. From the repo, on first session, the agent should:
   - Read `framework/README.md` and this file.
   - Confirm its identity matches a row here (or ask the user to add it).
   - Bootstrap or join a feature folder under `features/`.

---

## Conventions for identities

- One identity per repo, not per agent. The repo is the unit of identity — different agent sessions in the same repo share the same identity.
- Identities never change once in use (they appear in historical filenames). If you need to rename, retire the old identity and start a new one; don't rewrite history.
- Identities must be filesystem-safe: `[a-z0-9-]+`.
- The `orchestrator` identity is reserved — there is exactly one orchestrator per shared-context repo, and its CWD is the shared-context root.
