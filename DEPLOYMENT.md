# GhostToGhost — Deployment

## Architecture (what actually runs where)

| Layer | Technology | Needs a Node server? |
|-------|------------|----------------------|
| UI | Next.js (client components) | No |
| Firebase client | Auth, Firestore, Storage in the browser | No |
| Message side effects | Cloud Functions | No (Firebase-managed) |
| Push SW | Static `public/firebase-messaging-sw.js` | No |

This app does **not** use Next.js SSR, API routes, or server actions in production. Real-time data comes from the Firebase Web SDK; chat metadata is updated by Cloud Functions.

### Do you need Firebase App Hosting?

**No.** App Hosting runs Next.js on Cloud Run with Git-based CI/CD. It is useful for SSR and API routes, but this project does not depend on either.

**Recommended split:**

| Target | Use for |
|--------|---------|
| **Local `npm run dev`** | Day-to-day development (fastest) |
| **Firebase Hosting** (static export) | Simple `*.web.app` frontend, same Firebase project |
| **Vercel** (optional) | Alternative frontend host; same env vars |
| **Firebase** (rules, storage rules, functions) | Backend only |

Use `npm run deploy:backend` when you change rules or functions. Deploy the frontend only when the UI changes.

---

## Prerequisites

- Node **20** (see `.nvmrc`)
- Firebase CLI logged in: `firebase login`
- Project alias in `.firebaserc` (`default` / `prod` → `ghosttoghost`)
- `.env.local` filled from `.env.local.example`

```bash
nvm use          # or: fnm use / mise use
npm install
cd functions && npm install && cd ..
```

---

## Local development (no deploy)

```bash
npm run dev
```

Open http://localhost:3000. This talks to your live Firebase project using `.env.local`. App Hosting is **not** involved.

---

## Deploy scripts

All scripts run from the **project root**. Override project with `FIREBASE_PROJECT=my-other-project npm run deploy:rules`.

| npm script | What it does |
|------------|----------------|
| `npm run deploy:rules` | Firestore rules, indexes, Storage rules |
| `npm run deploy:functions` | `functions/` TypeScript build → Cloud Functions |
| `npm run deploy:backend` | Rules + functions (typical backend change) |
| `npm run deploy:frontend` | Static Next.js build → Firebase Hosting |
| `npm run deploy:all` | Backend, then frontend |

Underlying scripts live in `scripts/`:

```
deploy-rules.sh      → firebase deploy --only firestore:rules,firestore:indexes,storage
deploy-functions.sh  → npm --prefix functions run build && firebase deploy --only functions
deploy-backend.sh    → deploy-rules + deploy-functions
deploy-frontend.sh   → generate SW, npm run build, firebase deploy --only hosting
deploy-all.sh        → deploy-backend + deploy-frontend
```

### Build paths

| Build | Working directory | Command |
|-------|-------------------|---------|
| Frontend | Project root | `npm run build:frontend` |
| Functions | `functions/` | `npm run build:functions` |

---

## First-time Firebase Hosting setup

If Hosting is not enabled yet:

1. [Firebase Console → Hosting](https://console.firebase.google.com/project/ghosttoghost/hosting) → **Get started**
2. Deploy once: `npm run deploy:frontend`
3. Note the URL (e.g. `https://ghosttoghost.web.app`)
4. **Authentication → Authorized domains** → add that hostname

---

## Vercel (optional frontend)

1. Import `moonman89/ghosttoghost`
2. Set all `NEXT_PUBLIC_*` vars from `.env.local`
3. Build command: `npm run build:frontend`
4. Output directory: `out`
5. Add the Vercel domain to Firebase Auth authorized domains

No Cloud Functions or rules deploy from Vercel — run `npm run deploy:backend` separately.

---

## App Hosting (legacy / optional)

`apphosting.yaml` remains for the existing Git-connected backends but is **not** required for development or the scripts above. App Hosting was causing slow, fragile CI builds (Next.js version gates, duplicate backends).

Prefer **Firebase Hosting** or **Vercel** for this app unless you later add SSR or server APIs.

---

## Typical workflows

**Changed Firestore/Storage rules only:**
```bash
npm run deploy:rules
```

**Changed Cloud Functions only:**
```bash
npm run deploy:functions
```

**Changed UI only:**
```bash
npm run deploy:frontend
```

**Release everything:**
```bash
npm run deploy:all
```

---

## Console checklist (one-time)

- [ ] Anonymous Auth enabled
- [ ] Firestore + Storage initialized
- [ ] App Check reCAPTCHA key in `.env.local` (and Hosting env if used)
- [ ] Authorized domains: `localhost`, Hosting URL, Vercel URL (if any)

See [SECURITY_NOTES.md](./SECURITY_NOTES.md) and [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md).
