# Deploying Ziplink

Two domains, one deployment:
- **Main app:** `https://ziplink.ash-labs.tech` (landing, login, dashboard, API)
- **Short links:** `https://zl.ash-labs.tech/<code>` (redirects)

Both point at the same Vercel project. `src/middleware.ts` forwards app pages
hit on the short domain back to the main site.

## 1. Create the Vercel project
Deploy the **`web/`** directory (the Next.js app), not the repo root.

**Option A — CLI** (with the [Vercel CLI](https://vercel.com/docs/cli) installed and logged in):
```
cd web
vercel link        # or: vercel --yes   (creates/links a project)
vercel --prod
```

**Option B — Dashboard:** Import the repo, then set **Root Directory = `web`**.
Framework preset auto-detects as Next.js.

## 2. Environment variables (Vercel → Settings → Environment Variables)
Add these for **Production** (and Preview if you want previews to work).

Public:
```
NEXT_PUBLIC_BASE_URL=https://your-app-domain
NEXT_PUBLIC_SITE_URL=https://your-app-domain
NEXT_PUBLIC_SHORT_BASE_URL=https://your-short-domain
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-web-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id
```

Secret (from the service account JSON — same values as `web/.env.local`):
```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```
Notes:
- For `FIREBASE_PRIVATE_KEY`, paste the value **with the literal `\n`** sequences,
  wrapped in double quotes. The app converts `\n` → real newlines at runtime.
- Never commit these; add them only in the Vercel dashboard.

## 3. Attach the domains (Vercel → Settings → Domains)
Add both:
- `ziplink.ash-labs.tech`
- `zl.ash-labs.tech`

Then at your DNS provider for **ash-labs.tech**, add CNAME records (Vercel shows
the exact target, typically `cname.vercel-dns.com`):
```
ziplink   CNAME   cname.vercel-dns.com
zl        CNAME   cname.vercel-dns.com
```

## 4. Firebase — authorize the production domain
Firebase console → **Authentication → Settings → Authorized domains** → add:
- `ziplink.ash-labs.tech`
(and the `*.vercel.app` URL if you test on the preview domain)

Without this, Google sign-in is blocked on the live site.

## 5. (Optional) Deploy Firestore rules & index
From `firebase/` with the Firebase CLI:
```
firebase deploy --only firestore:rules
```
(The list query sorts in memory, so no composite index is required.)

## Verify after deploy
- `https://ziplink.ash-labs.tech/api/health` → `{ "status":"ok","admin":true }`
- Sign in with Google → create a link → it returns a `https://zl.ash-labs.tech/<code>` URL
- Opening that short URL 301-redirects and increments the click count
- Hitting `https://zl.ash-labs.tech/` (no code) forwards to the main site
