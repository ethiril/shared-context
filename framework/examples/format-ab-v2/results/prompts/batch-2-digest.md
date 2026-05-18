You will receive 1 shared-context digest artefact in short-key JSONL format. Extract canonical fields as a JSON object. Return ONLY the JSON object, no prose.

Expected fields: type, author, at, summary, per_repo (map of repo to state), contracts_active[], decisions_live[], open_cross_repo[], shipped_since_bootstrap[] (objects with at least repo + what), where_to_look (map).

--- LEGEND (short-key)
```
{
  "t": "type", "k": "kind", "f": "from", "a": "author",
  "at": "at", "to": "to", "s": "summary", "r": "refs", "b": "body",
  "ti": "title", "st": "status", "af": "affects",
  "ru": "rule", "w": "why", "ar": "alternatives_rejected", "co": "consequences",
  "n": "name", "v": "version", "cs": "consumers", "br": "breaking",
  "q": "queue", "pf": "payload_fields", "ex": "expectations",
  "rp": "repo", "g": "current_goal", "d": "done", "nx": "next", "bk": "blocked_on",
  "c": "contracts_in_play", "oq": "open_questions",
  "pr": "per_repo", "ca": "contracts_active", "dl": "decisions_live",
  "oc": "open_cross_repo", "sb": "shipped_since_bootstrap", "wl": "where_to_look",
  "h": "headline", "wrs": "where_each_repo_stands",
  "ssl": "shipped_since_last", "dm": "decisions_made",
  "ofh": "open_for_human", "nu": "next_up"
}

```

--- Artefact (short-key)
```
{"t":"digest","a":"api","at":"2026-01-10T10:30:00Z","s":"v1 welcome-email pipeline shipped end-to-end on staging; both repos green, no open cross-repo questions.","pr":{"api":"shipped; tests green; staging verified; not blocked","worker":"consumer wired; payload validated; non-`en` falls through; staging green; not blocked"},"ca":["contracts/welcome-email-job/2026-01-10T09-00-00-api-v1.0.0.md"],"dl":["decisions/2026-01-10T09-00-00-fire-and-forget-semantics.md"],"oc":[],"sb":[{"rp":"api","what":"POST /signup enqueue path","r":"log/2026-01-10T09-30-00-api-shipped.md"},{"rp":"worker","what":"consumer + SES send + staging verification","r":"log/2026-01-10T10-15-00-worker-ack.md"}],"wl":{"wire_format":"contracts/welcome-email-job/...v1.0.0.md","why_fire_and_forget":"decisions/2026-01-10T09-00-00-fire-and-forget-semantics.md","per_repo_state":"repos/api/..., repos/worker/..."}}

```

