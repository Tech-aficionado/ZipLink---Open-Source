# Architecture

A quick tour of how Ziplink is put together, for anyone who wants to work on it.

## Overview

Ziplink is a single Next.js app. The frontend and the backend live in the same
project — the API is just a set of Next.js route handlers running on the Node.js
runtime. Firebase handles the two hard parts: who you are (Authentication) and
where the data lives (Cloud Firestore).

- **Framework:** Next.js (App Router, TypeScript, Tailwind CSS)
- **Auth:** Firebase Authentication (Google sign-in). ID tokens are verified on
  the server with the Firebase Admin SDK.
- **Data:** Cloud Firestore, accessed server-side through firebase-admin.
- **Short codes:** generated with `nanoid` (7 characters), or a custom alias you choose.

## Project layout

```
web/src/
  app/
    page.tsx                     Landing page (public)
    login/page.tsx               Google sign-in
    dashboard/page.tsx           Create and manage your links (auth required)
    [shortCode]/route.ts         Public redirect — 301 to the original URL
    api/
      health/route.ts            Service status
      links/route.ts             Create (POST) and list (GET) links
      links/[shortCode]/route.ts Fetch (GET) and delete (DELETE) a single link
  lib/
    firebaseAdmin.ts             Admin SDK setup + token verification
    firebaseClient.ts            Client SDK + analytics
    api.ts                       Typed fetch helpers that attach the ID token
  components/                    Shared UI
  context/AuthContext.tsx        Auth provider and the useAuth() hook
  middleware.ts                  Two-domain routing (see below)
firebase/
  firestore.rules                Owner-scoped security rules
  firestore.indexes.json         Index definitions
```

All API route handlers set `export const runtime = 'nodejs'` because the Firebase
Admin SDK needs the Node.js runtime (not the Edge runtime).

## Data model

Firestore collection `links`, where the document id is the short code:

| Field | Type | Notes |
|-------|------|-------|
| `shortCode` | string | Also the document id |
| `originalUrl` | string | Validated http/https URL |
| `ownerUid` | string | Firebase Auth uid of the creator |
| `ownerEmail` | string | Creator's email |
| `createdAt` | Timestamp | Server timestamp |
| `clicks` | number | Starts at 0 |
| `lastAccessedAt` | Timestamp \| null | Set on each redirect |

Listing a user's links uses an equality filter on `ownerUid` and sorts by
`createdAt` in memory, so no composite index is required.

## Authentication

1. The browser signs in with Firebase Auth and gets an ID token.
2. Every `/api/*` request carries `Authorization: Bearer <ID token>`.
3. The server verifies the token with the Admin SDK and reads the uid + email.
4. The public redirect route `/[shortCode]` needs no auth.

If the server-side admin credentials aren't set, the app still builds and the UI
loads, but authenticated endpoints return `503` and `/api/health` reports
`admin: false`. This keeps local development and CI builds working without secrets.

## API

Everything is JSON. Errors come back as `{ "error": "message" }` with an
appropriate status code.

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `GET` | `/api/health` | no | `{ status, admin }` |
| `POST` | `/api/links` | yes | Body `{ originalUrl, customCode? }` → `201` |
| `GET` | `/api/links` | yes | Your links, newest first |
| `GET` | `/api/links/[code]` | yes | One link (owner only) |
| `DELETE` | `/api/links/[code]` | yes | Delete a link (owner only) |
| `GET` | `/[code]` | no | `301` to the original URL, counts the click |

Creating a link:
- A custom alias must match `^[a-zA-Z0-9_-]{3,32}$`; a few reserved words
  (`api`, `health`, `login`, `dashboard`, `_next`, `favicon.ico`) are rejected.
- If the alias is already taken, the API returns `409`.
- Without a custom alias, a 7-character code is generated (with a retry on the
  rare collision).

## Two-domain routing

Ziplink can run the app and the short links on two different domains — for
example the app on `app.example.com` and links on `s.example.com` — both pointing
at the same deployment. `middleware.ts` handles this: if an app page is requested
on the short domain, it's forwarded to the main site, leaving the short domain
purely for redirects. When both URLs are the same (the default, and local dev),
the middleware does nothing.

The relevant environment variables are `NEXT_PUBLIC_SITE_URL` (the app) and
`NEXT_PUBLIC_SHORT_BASE_URL` (where short links live). See `README.md` and
`DEPLOY.md` for setup.
