# GhostToGhost — Security Notes

## Deploy

```bash
# Rules + indexes + storage
firebase deploy --only firestore:rules,firestore:indexes,storage

# Cloud Functions (message side effects + push)
cd functions && npm install && npm run build && cd ..
firebase deploy --only functions
```

Full deploy:

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage,functions
```

---

## Trust Model

| Layer | Responsibility |
|-------|----------------|
| **App Check** | reCAPTCHA v3 attestation on client writes (`request.app != null`) |
| **Firestore Rules** | Auth gate, membership, immutable fields, client write shape |
| **Storage Rules** | Image-only uploads, size/MIME limits, UID-prefixed paths |
| **Cloud Functions** | Chat preview, unread counters, storage URL validation, rate limits, FCM push |
| **Client** | Create message docs and read receipts only |

Clients **cannot** write `lastMessage`, `lastMessageAt`, `lastMessageSenderId`, `updatedAt`, or `unreadCounts` on chat documents. Those fields are managed exclusively by Cloud Functions using the Admin SDK.

---

## App Check

### Client setup

1. Firebase Console → **App Check** → register the web app with **reCAPTCHA v3**.
2. Copy the site key to `NEXT_PUBLIC_APPCHECK_RECAPTCHA_SITE_KEY`.
3. For local dev, create a **debug token** in Console and set `NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN`.
4. `FirebaseBootstrap` initializes App Check on load via `src/lib/appCheck.ts`.

### Rules enforcement

All client **writes** require `trustedClient()`:

```
signedIn() && request.app != null
```

Reads still require auth only, so you can monitor App Check in Console before turning on enforcement for Functions.

### Console rollout

1. Register App Check for the web app.
2. Deploy rules (writes require `request.app`).
3. Enable **Enforcement** for Firestore when ready.
4. Optionally enforce App Check on Cloud Functions triggers in Console.

---

## Push Notifications (FCM)

### Client setup

1. Firebase Console → **Cloud Messaging** → generate a **Web Push** key pair (VAPID).
2. Set `NEXT_PUBLIC_FIREBASE_VAPID_KEY` in `.env.local`.
3. On sign-in, `registerPushNotifications()` registers `/api/firebase-messaging-sw` and saves the token to `users/{uid}/fcmTokens/{tokenId}`.

### Service worker

Dynamic route: `src/app/api/firebase-messaging-sw/route.ts` — injects Firebase config at runtime so secrets stay in env vars.

Background clicks open `/chat?open={chatId}`.

### Cloud Function

After successful message side effects, `sendMessagePushNotifications()` multicasts to all FCM tokens for chat members except the sender.

---

## Cloud Functions

### `onMessageCreated`

**Trigger:** `chats/{chatId}/messages/{messageId}` on create

**Validates:**
- `senderId` is present
- `senderId` is in `chat.memberIds`
- Text messages are non-empty
- Image messages include `storagePath` owned by sender: `chatUploads/{chatId}/{senderId}/{timestamp}_{filename}`
- `imageUrl` references Firebase Storage and matches `storagePath`
- Rate limits (see below)

**Applies (transaction):**
- `lastMessage` preview (`text` truncated or `"Photo"`)
- `lastMessageAt` from message `createdAt`
- `lastMessageSenderId`
- `updatedAt`
- `unreadCounts`: `+1` for every member **except** sender
- `lastProcessedMessageId` for idempotency
- `sideEffectsStatus: "applied"` on the message doc

**Then:** FCM push to other members.

**On failure:** sets `sideEffectsStatus` to `rejected`, `rate_limited`, or `error` without updating chat metadata.

### `onMessageReadReceipt`

**Trigger:** `chats/{chatId}/messages/{messageId}` on update

**When:** `readBy` array grows

**Applies:** sets `unreadCounts[uid] = 0` for each newly added UID who is a chat member.

### Rate limits (`system/rateLimits/users/{uid}/chats/{chatId}`)

| Limit | Window | Max |
|-------|--------|-----|
| Global per user | 60s | 30 messages |
| Per chat | 60s | 15 messages |
| Burst | 10s | 5 messages |
| Duplicate text | 10s | same trimmed text blocked |

Rate-limited messages are created (rules allow) but get `sideEffectsStatus: rate_limited` and do not update chat metadata.

---

## Firestore Rules Summary

### System (`/system/**`)

- **Deny all client access.** Rate-limit counters are written only by Cloud Functions.

### Users (`/users/{userId}/fcmTokens/{tokenId}`)

- **Read:** owner only
- **Create/update:** owner + App Check; `token`, `platform: web`, `updatedAt`
- **Delete:** owner + App Check

### Chats (`/chats/{chatId}`)

- **Read:** members only
- **Create:** trusted client; caller in `memberIds`
- **Update:** **denied for clients**
- **Delete:** denied

### Messages (`/chats/{chatId}/messages/{messageId}`)

- **Create:** trusted client + member; `senderId == request.auth.uid`
- **Image create:** `storagePath` matching `chatUploads/{chatId}/{auth.uid}/*`
- **Server fields blocked on create:** `sideEffectsStatus`, `sideEffectsReason`, `sideEffectsAppliedAt`
- **Update:** read-receipt only
- **Delete:** denied

### Users, usernames, typing

All writes require `trustedClient()` — see `firestore.rules`.

---

## Storage Rules

**Path:** `chatUploads/{chatId}/{uid}/{timestamp}_{filename}`

- Read: authenticated chat member
- Create: authenticated member, `uid` segment must equal `request.auth.uid`, image MIME, max 10 MB
- Update/delete: denied

---

## Old Chat Compatibility

- Chats without `unreadCounts` initialize counters as `0` on first message.
- Chats without `lastProcessedMessageId` work normally.
- Image messages sent before `storagePath` was required will fail function validation — re-send after upgrade.

---

## Remaining Gaps

| Gap | Recommendation |
|-----|----------------|
| Username reservation races | Callable `reserveUsername()` with transaction |
| Group membership changes | Callable `addGroupMember()` / `removeGroupMember()` |
| Direct chat ID enforcement | Callable `createDirectChat()` or stricter create rules |
| Account deletion cascade | Auth `onDelete` trigger |
| Stale FCM token cleanup | Function to prune invalid tokens after multicast failures |
| Content moderation | External moderation pipeline on message create |

---

## Rules Testing

See `TESTING_CHECKLIST.md` for step-by-step verification.

Quick deny scenarios:

1. Client updates `chats/{id}` `unreadCounts` → **deny**
2. Client creates message without App Check token → **deny** (after App Check enabled)
3. Client creates image message without `storagePath` → **deny**
4. Client writes `system/rateLimits/...` → **deny**
5. Client sets `sideEffectsStatus` on message create → **deny**
