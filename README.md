<div align="center">

# 🔗 Ziplink

**Shorten links in a zip.** A fast, self-hostable URL shortener built with Next.js and Firebase.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-DD2C00?logo=firebase&logoColor=white)](https://firebase.google.com/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#contributing)

</div>

Ziplink turns long, unwieldy URLs into short, shareable links and tracks how often
they're clicked. It runs as a single Next.js app with Firebase for auth and storage,
so there's no separate server or database to babysit — clone it, add your Firebase
keys, and you're running.

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Screenshots](#screenshots)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [A separate domain for short links](#a-separate-domain-for-short-links-optional)
- [API](#api)
- [Project structure](#project-structure)
- [Deploying](#deploying)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Google sign-in** — no passwords to store or remember
- **Custom aliases** — let Ziplink generate a code, or choose your own
- **QR codes** — preview and download a QR for any link
- **Click tracking** — see how many times each link has been opened, and when
- **Search & manage** — filter your links and delete the ones you're done with
- **Dark, modern UI** — dark-first design with a clean dashboard
- **Optional split domain** — serve short links from a separate short domain

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | [Next.js](https://nextjs.org/) (App Router) + TypeScript |
| Styling | [Tailwind CSS](https://tailwindcss.com/) |
| Auth | [Firebase Authentication](https://firebase.google.com/docs/auth) (Google) |
| Database | [Cloud Firestore](https://firebase.google.com/docs/firestore) |
| API | Next.js route handlers on the Node.js runtime + Firebase Admin |
| Hosting | [Vercel](https://vercel.com/) (recommended) |

## Screenshots

<!--
Add screenshots here once you have them, e.g.:
| Landing | Dashboard |
|---------|-----------|
| ![Landing](docs/landing.png) | ![Dashboard](docs/dashboard.png) |
-->

_Coming soon._

## Getting started

### 1. What you'll need

- Node.js 20 or newer
- A Firebase project (the free Spark plan is plenty)

### 2. Clone and install

```bash
git clone https://github.com/Tech-aficionado/ZipLink---Open-Source.git
cd ZipLink---Open-Source/web
npm install
```

### 3. Set up Firebase

In the [Firebase console](https://console.firebase.google.com):

1. Create a project (or reuse one you already have).
2. Under **Authentication → Sign-in method**, enable **Google**.
3. Create a **Cloud Firestore** database.
4. Copy your web app config from **Project settings → General → Your apps**.
5. Generate an admin key from **Project settings → Service accounts →
   Generate new private key** (this downloads a JSON file).

### 4. Add your environment variables

```bash
cp .env.example .env.local
```

The public `NEXT_PUBLIC_FIREBASE_*` values come from step 4 above. The server-side
`FIREBASE_*` values come from the service-account JSON in step 5. For the private
key, keep the literal `\n` sequences and wrap the whole value in quotes:

```env
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
```

`.env.local` is git-ignored, so your keys never leave your machine.

### 5. Run it

```bash
npm run dev
```

Open <http://localhost:3000> and sign in.

> **Heads up:** until the server-side Firebase credentials are set, the UI still
> loads but creating links returns a `503`. Check the status any time at
> `GET /api/health`, which reports whether the admin credentials are configured.

## Environment variables

| Variable | Where it comes from |
|----------|---------------------|
| `NEXT_PUBLIC_SITE_URL` | Your app's own URL (e.g. `http://localhost:3000`) |
| `NEXT_PUBLIC_SHORT_BASE_URL` | The domain your short links use — can match the site URL |
| `NEXT_PUBLIC_BASE_URL` | App origin; a fallback for the two above |
| `NEXT_PUBLIC_FIREBASE_*` | Firebase web app config |
| `FIREBASE_PROJECT_ID` | Service account JSON |
| `FIREBASE_CLIENT_EMAIL` | Service account JSON |
| `FIREBASE_PRIVATE_KEY` | Service account JSON (keep the `\n`, wrap in quotes) |

See [`web/.env.example`](web/.env.example) for the full list.

## A separate domain for short links (optional)

By default your short links look like `yourapp.com/abc123`. If you'd rather serve
them from a shorter domain — say `s.example.com/abc123` while the app lives at
`app.example.com` — point both domains at the same deployment and set
`NEXT_PUBLIC_SHORT_BASE_URL` to the short one. App pages requested on the short
domain are automatically forwarded to the main site, so the short domain stays
purely for redirects. Full walkthrough in [`DEPLOY.md`](DEPLOY.md).

## API

| Method | Path | Auth | What it does |
|--------|------|------|--------------|
| `GET` | `/api/health` | – | Reports service status |
| `POST` | `/api/links` | ✅ | Create a short link (optional `customCode`) |
| `GET` | `/api/links` | ✅ | List your links, newest first |
| `GET` | `/api/links/[code]` | ✅ | Fetch one of your links |
| `DELETE` | `/api/links/[code]` | ✅ | Delete one of your links |
| `GET` | `/[code]` | – | 301 redirect to the original URL, counts the click |

Authenticated requests send `Authorization: Bearer <Firebase ID token>`.

## Project structure

```
.
├── web/                      Next.js app (UI + API)
│   ├── src/
│   │   ├── app/              Pages, API route handlers, redirect route
│   │   ├── components/       Shared UI + landing sections
│   │   ├── context/          Auth provider / useAuth hook
│   │   ├── lib/              Firebase client + admin, API helpers
│   │   └── middleware.ts     Two-domain routing
│   └── .env.example          Environment template
├── firebase/                 Firestore rules and indexes
├── ARCHITECTURE.md           How it fits together
└── DEPLOY.md                 Deployment guide
```

## Deploying

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Tech-aficionado/ZipLink---Open-Source&root-directory=web)

Ziplink deploys cleanly to Vercel — import the `web/` folder (set it as the root
directory), add your environment variables, and you're live. Firestore rules and
indexes live in `firebase/` and can be deployed with the Firebase CLI. Step-by-step
instructions, including the optional two-domain setup, are in [`DEPLOY.md`](DEPLOY.md).

## Contributing

Issues and pull requests are welcome. If you're planning a bigger change, open an
issue first so we can talk it through.

## License

Released under the [MIT License](LICENSE).
