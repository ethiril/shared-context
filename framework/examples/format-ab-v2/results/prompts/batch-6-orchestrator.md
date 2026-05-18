You will receive 1 shared-context orchestrator-snapshot artefact in short-key JSONL format. Extract canonical fields as a JSON object. Return ONLY the JSON object, no prose.

Expected fields: type, author, at, status, summary, headline (string), where_each_repo_stands (map of repo to state/note), shipped_since_last[] (objects with what + ref), decisions_made[], open_for_human[], next_up (map of repo or "joint" to plan).

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
{"t":"orchestrator-snapshot","a":"orchestrator","at":"2026-01-10T10:35:00Z","st":"done","s":"Welcome-emails v1 is shipped — API enqueues on signup, worker sends via SES, staging verified, no open questions.","h":"v1 end-to-end shipped: signup enqueues a welcome-email job, worker dequeues and sends through SES, staging green, no open cross-repo asks.","wrs":{"api":"POST /signup enqueuing on welcome-emails against welcome-email-job v1.0.0; tests green; staging verified; done for v1","worker":"consumer wired with payload validation and English-template fall-through for non-`en` locales; staging end-to-end green; done for v1"},"ssl":[{"what":"API enqueue path live on staging","r":"log/2026-01-10T09-30-00-api-shipped.md"},{"what":"Worker consumer + SES send + staging verification","r":"log/2026-01-10T10-15-00-worker-ack.md"},{"what":"ADR pinning fire-and-forget semantics","r":"decisions/2026-01-10T09-00-00-fire-and-forget-semantics.md"},{"what":"Wire contract published","r":"contracts/welcome-email-job/2026-01-10T09-00-00-api-v1.0.0.md"}],"dm":["Fire-and-forget for v1 — API isn't told about send outcomes; queue is the contract boundary"],"ofh":[],"nu":{"api":"nothing for v1; pick up v2 retry semantics when scoped","worker":"nothing for v1; same","joint":"production deploy of both services in either order — fire-and-forget means no required sequencing"}}

```

