# Ziplink

Ziplink is a small, self-hostable URL shortener. Paste a long link, get a short
one you can share, and keep an eye on how often it gets clicked. It's built on
Next.js and Firebase, so there's no separate server or database to babysit.

## What it does

- Sign in with Google — nothing to remember, no passwords to store
- Shorten any link, or pick your own custom alias
- Copy a link or download its QR code
- See click counts and when a link was last opened
- Search your links and delete the ones you're done with
- Dark theme out of the box

## Built with

- Next.js (App Router) and TypeScript
- Tailwind CSS
- Firebase Authentication and Cloud Firestore
- API handled by Next.js route handlers on the Node.js runtime

## Project layout

```
web/         The Next.js app — UI and API routes
firebase/    Firestore security rules and indexes
```

## Getting started

### 1. What you'll need

- Node.js 20 or newer
- A Firebase project (the free Spark plan is plenty)

### 2. Clone and install

```bash
git clone https://github.com/Tech-aficionado/ZipLink---Open-Source-Url-Shortner.git
cd ZipLink---Open-Source-Url-Shortner/web
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

Copy the example file and fill in the values:

```bash
cp .env.example .env.local
```

The public `NEXT_PUBLIC_FIREBASE_*` values come from step 4 above. The server
`FIREBASE_*` values come from the service-account JSON in step 5. For the private
key, keep the literal `\n` sequences and wrap the whole thing in quotes:

```env
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
```

`.env.local` is git-ignored, so your keys stay on your machine.

### 5. Run it

```bash
npm run dev
```

Open http://localhost:3000 and sign in.

> Until the server-side Firebase credentials are set, the UI still loads but
> creating links returns a 503. You can check the status any time at
> `GET /api/health`, which reports whether the admin credentials are configured.

## Environment variables

| Variable | Where it comes from |
|----------|---------------------|
| `NEXT_PUBLIC_SITE_URL` | Your app's own URL (e.g. `http://localhost:3000`) |
| `NEXT_PUBLIC_SHORT_BASE_URL` | The domain your short links use — can be the same as the site URL |
| `NEXT_PUBLIC_BASE_URL` | App origin; kept as a fallback for the two above |
| `NEXT_PUBLIC_FIREBASE_*` | Firebase web app config |
| `FIREBASE_PROJECT_ID` | Service account JSON |
| `FIREBASE_CLIENT_EMAIL` | Service account JSON |
| `FIREBASE_PRIVATE_KEY` | Service account JSON (keep the `\n`, wrap in quotes) |

See `.env.example` for the full list.

## A separate domain for short links (optional)

By default your short links look like `yourapp.com/abc123`. If you'd rather have
them on a shorter domain — say `s.example.com/abc123` while the app lives at
`app.example.com` — point both domains at the same deployment and set
`NEXT_PUBLIC_SHORT_BASE_URL` to the short one. Requests to app pages on the short
domain are forwarded back to the main site automatically. There's a full
walkthrough in `DEPLOY.md`.

## API

| Method | Path | Auth | What it does |
|--------|------|------|--------------|
| `GET` | `/api/health` | no | Reports service status |
| `POST` | `/api/links` | yes | Create a short link (optional `customCode`) |
| `GET` | `/api/links` | yes | List your links, newest first |
| `GET` | `/api/links/[code]` | yes | Fetch one of your links |
| `DELETE` | `/api/links/[code]` | yes | Delete one of your links |
| `GET` | `/[code]` | no | 301 redirect to the original URL, counts the click |

Authenticated requests send `Authorization: Bearer <Firebase ID token>`.

## Deploying

Ziplink deploys cleanly to Vercel — import the `web/` folder, add your
environment variables, and you're live. Firestore rules and indexes live in
`firebase/` and can be deployed with the Firebase CLI. Step-by-step instructions,
including the optional two-domain setup, are in `DEPLOY.md`.

## Contributing

Issues and pull requests are welcome. If you're planning a bigger change, open an
issue first so we can talk it through.

## License

Released under the MIT License. See `LICENSE` for details.
