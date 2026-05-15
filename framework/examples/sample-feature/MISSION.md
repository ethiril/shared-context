---
type: mission-root
feature: welcome-emails
status: active
created_at: 2026-01-10T09:00:00Z
created_by: api
---

# Mission Control — welcome-emails

This file captures **what we agreed to do**. For **where we are right now**, open `dashboard.html` at the repo root, or the latest file in [`orchestrator/`](orchestrator/).

> This is a fictitious sample feature. It exists to show the shape of a complete shared-context feature folder. Copy the structure, not the content.

## Goal

When a user signs up, send a welcome email asynchronously. The API enqueues a job on signup; the worker consumes the queue and sends the email through the existing SES integration. No retry policy for v1 — best-effort.

## Scope

**In**
- `POST /signup` enqueues a `welcome-email` job on signup.
- Worker consumes the job and sends the email via SES.
- Fire-and-forget semantics: no acknowledgement back to the API.

**Out**
- Retry policy (deferred to v2).
- Localisation (English only for v1).
- Click tracking.

## Repos involved

- `api` — owns the signup endpoint and enqueues the job.
- `worker` — owns the job consumer and the email send.

## Success criteria

- A successful signup enqueues exactly one job.
- The worker sends exactly one email per job under nominal conditions.
- A worker outage does not block signup.

## Amendments

<!-- Append a dated one-liner here only when scope genuinely changes. See CONVENTIONS.md. -->
