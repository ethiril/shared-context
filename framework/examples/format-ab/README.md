# format-ab — A/B fixtures for `agent-format-pass`

Same fictional `welcome-emails` scenario as `../sample-feature/`, rendered in alternative on-disk formats so we can measure token cost and parse reliability per artefact type.

## Layout

```
format-ab/
├── log/
│   ├── toml/                       # 2 entries, one file per event
│   └── jsonl/                      # 2 entries in a single rolling log.jsonl
├── digest/
│   ├── denser-md/                  # density pass, same format on disk
│   └── toml/                       # frontmatter as TOML, body = """..."""
├── repos/
│   ├── yaml-only/                  # everything in frontmatter, no body
│   └── toml/                       # same shape, TOML syntax
├── contracts/
│   ├── toml/
│   └── json-schema/                # raw JSON Schema, no markdown wrapper
├── decisions/
│   ├── denser-md/
│   └── toml/
└── orchestrator/
    ├── denser-md/
    └── hybrid/                     # YAML frontmatter + structured "where each repo stands" map + narrative body
```

## Baseline (md+YAML)

The md+YAML baseline is **not duplicated here** — it lives in `../sample-feature/`. The measurement harness reads the baseline files directly from that path and compares them against the alternative-format fixtures in this folder.

## Re-measuring

See `bin/measure-formats.py` once the harness lands. The intent is a one-command run that emits a comparison table per artefact type.
