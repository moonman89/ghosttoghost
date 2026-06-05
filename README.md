# GhostToGhost

A **Telegram-style messaging app** with anonymous sign-in, real-time chats, and a minimal editorial UI. Pick a username, start a direct or group conversation, send text and images, and see typing indicators and read receipts — without email or phone verification.

Built with **Next.js** and **Firebase** (Auth, Firestore, Storage, Cloud Functions, App Check, FCM).

| | Link |
|---|------|
| **Firebase Console** | [console.firebase.google.com/project/ghosttoghost](https://console.firebase.google.com/project/ghosttoghost) |
| **GitHub** | [github.com/moonman89/ghosttoghost](https://github.com/moonman89/ghosttoghost) |
| **Local dev** | [http://localhost:3000](http://localhost:3000) (after `npm run dev`) |
| **Public app URL** | Not deployed yet — see [Deploy](#deploy) below |

---

## Features

| Area | What you get |
|------|----------------|
| **Auth** | Firebase Anonymous Auth + username registry |
| **Chats** | Direct (deterministic IDs) and group conversations |
| **Messages** | Real-time text + image messages |
| **Presence** | Typing indicators per chat |
| **Read state** | Read receipts and per-chat unread counts |
| **Search** | Find users by username to start a chat |
| **Security** | Server-side message side effects, App Check on writes, rate limits |
| **Push** | FCM web notifications (opt-in) |
| **UI** | Responsive Telegram-like layout, HS68-inspired aesthetic |

---

## Architecture

```
Client
  ├─ create message doc only
  ├─ upload images → chatUploads/{chatId}/{uid}/{timestamp}_{file}
  └─ update readBy on messages

Cloud Functions
  ├─ onMessageCreated → validate, rate-limit, update chat preview + unreadCounts, send FCM
  └─ onMessageReadReceipt → clear unread when readBy grows

Firestore rules
  └─ clients cannot update /chats/* metadata (preview, unread, etc.)
```

Message metadata (`lastMessage`, `unreadCounts`, …) is **never** written from the client. Cloud Functions own those fields via the Admin SDK.

---

## Stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS 4
- **Backend:** Firebase Auth, Firestore, Storage, Cloud Functions (Node 20)
- **Security:** Firestore/Storage rules, App Check (reCAPTCHA v3), abuse rate limits

---

## Quick start

### 1. Clone and install

```bash
git clone https://github.com/moonman89/ghosttoghost.git
cd ghosttoghost
npm install
```

### 2. Firebase config

Copy the example env file and fill in values from the Firebase Console:

```bash
cp .env.local.example .env.local
```

Required variables:

- `NEXT_PUBLIC_FIREBASE_*` — web app SDK config
- `NEXT_PUBLIC_APPCHECK_RECAPTCHA_SITE_KEY` — App Check (reCAPTCHA v3)
- `NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN` — local dev only
- `NEXT_PUBLIC_FIREBASE_VAPID_KEY` — web push notifications

Or link an existing project:

```bash
npm run setup:firebase
```

### 3. Firebase Console setup

In [Firebase Console](https://console.firebase.google.com/project/ghosttoghost):

1. **Authentication** → Get started → enable **Anonymous**
2. **Firestore** → database created (production mode)
3. **Storage** → Get started → production mode
4. **App Check** → register web app (reCAPTCHA v3)
5. **Cloud Messaging** → Web Push key pair → VAPID key in `.env.local`

### 4. Deploy backend

```bash
cd functions && npm install && npm run build && cd ..
firebase deploy --only firestore:rules,firestore:indexes,storage,functions
```

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project structure

```
src/
  app/              # Next.js routes (login, chat)
  components/       # UI (sidebar, chat window, bubbles, modals)
  context/          # Auth context
  lib/
    firebase.ts     # Firebase client init
    auth.ts         # Anonymous sign-in
    firestore/      # Chats, messages, typing, uploads, FCM
    messaging.ts    # Push notification registration
    appCheck.ts     # App Check init
functions/
  src/
    messageSideEffects.ts   # Preview, unread, validation
    rateLimits.ts           # Abuse limits
    pushNotifications.ts    # FCM multicast
firestore.rules
storage.rules
SECURITY_NOTES.md
TESTING_CHECKLIST.md
```

---

## Security

See [SECURITY_NOTES.md](./SECURITY_NOTES.md) for the full trust model, rule summary, and deploy steps.

See [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md) for manual verification scenarios.

Highlights:

- Chat metadata locked from client writes
- Image `storagePath` must match `chatUploads/{chatId}/{uid}/…`
- Rate limits: 30/min global, 15/min per chat, burst and duplicate-text guards
- App Check required on all client writes (`request.app != null`)

---

## Deploy

Right now only the **Firebase backend** is deployed (Firestore rules, Storage rules, Cloud Functions). The **Next.js frontend** runs locally — there is no `*.web.app` or `*.firebaseapp.com` URL yet because Firebase Hosting / App Hosting was not configured.

To get a public link:

1. **Firebase App Hosting** (recommended for Next.js) — [App Hosting in Console](https://console.firebase.google.com/project/ghosttoghost/apphosting) → connect the GitHub repo
2. **Vercel** — import `moonman89/ghosttoghost`, add the same `NEXT_PUBLIC_*` env vars
3. **Firebase Hosting** — requires a static export (`output: 'export'`); limited for this app (no API routes / SSR)

After deploy, add the live URL to this README and register it in Firebase Console → Authentication → **Authorized domains**.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run setup:firebase` | Create/link Firebase project and write `.env.local` |
| `firebase deploy --only …` | Deploy rules, storage, functions |

---

## License

Private project — all rights reserved unless otherwise specified.
