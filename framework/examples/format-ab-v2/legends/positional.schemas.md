# Positional record schemas

Field separator: `|`. Multi-value (inside a field): `~`. Embedded `|` in a value: `\|`.

Type is implicit from the source directory; not in the schema.

## log

```
kind|from|at|to|summary|refs|body
```

`to` and `refs` are `~`-separated lists.

## repos

```
repo|at|summary|current_goal|done|next|blocked_on|contracts_in_play|open_questions
```

`done`, `next`, `blocked_on` are `~`-separated lists. `contracts_in_play` and `open_questions` are inline JSON.

## decisions

```
title|author|at|summary|status|affects|rule|why|alternatives_rejected|consequences
```

`affects`, `why`, `consequences` are `~`-separated. `alternatives_rejected` is inline JSON.

## contracts

```
name|version|author|at|summary|consumers|breaking|status|queue|payload_fields|expectations
```

`consumers` is `~`-separated. `queue`, `payload_fields`, `expectations` are inline JSON.
