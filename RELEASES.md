# Ziplink release plan

## v0.2.0 — Link controls
- Enable or pause a link.
- Optional start and expiration timestamps.
- Server-derived lifecycle: active, scheduled, paused, expired, or error.
- Lifecycle enforcement at redirect time with dynamic, non-cacheable responses.
- Existing links remain active when control fields are absent.
- Correct alias-prefix and search-icon alignment at narrow widths and zoom.

## v0.3.0 — Campaign tools
- Up to five normalized tags per link.
- UTM builder for source, medium, campaign, term, and content.
- Final destination preview before saving.
- Search and filter by tag.
- CSV import with validation preview, resumable persisted jobs, bounded chunks,
  immutable row outcomes, and formula-safe reports.

## v0.4.0 — Protected links
- Password hashing with versioned, bounded scrypt parameters.
- Branded unlock page on the short-link host.
- Signed, HTTP-only, host-only, link-scoped unlock cookie.
- Transactional requester and per-link rate limits before password hashing.
- Password changes invalidate existing unlock sessions.

## Reliability and security contract
- `schemaVersion` is cumulative; unsupported or malformed control data fails closed.
- Do not roll back below v0.2.0 after controlled links have been written.
- Redirects use 302; successful unlock POST uses 303 and never replays a body.
- Public control, unlock, and redirect responses are dynamic and `no-store`.
- Scheduling uses server time; starts are inclusive and expiration is exclusive.
- Only absolute HTTP(S) destinations without credentials are accepted.
- Passwords, unlock cookies, and rate-limit identifiers are never logged.
- Import jobs are client-driven: processing pauses when the page closes and
  resumes when the owner reopens it.

## Decision log
1. Extend the existing link document instead of introducing normalized services.
2. Enforce lifecycle at redirect time instead of using a scheduler.
3. Use temporary redirects to prevent stale browser/CDN behavior.
4. Keep protected-link unlock and cookies on the short-link host.
5. Persist import state in Firestore but let the open client drive bounded chunks.
6. Represent lifecycle and password protection as separate UI states.
7. Accept Firestore transaction cost and temporary denial under distributed
   password attacks in exchange for no additional infrastructure.
