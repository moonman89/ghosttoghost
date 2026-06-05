# GhostToGhost — Security Testing Checklist

Run these after deploying rules, storage rules, and Cloud Functions.

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage,functions
```

Use two test accounts (User A, User B) in separate browsers or incognito windows.

---

## 1. Authentication & Profiles

- [ ] Unauthenticated Firestore read → denied
- [ ] Unauthenticated message create → denied
- [ ] User A creates username claim + profile → allowed (with App Check)
- [ ] User B creates same username claim → denied
- [ ] User A updates User B profile → denied
- [ ] User A updates own `displayName` → allowed

---

## 2. Chat Access

- [ ] User A creates direct chat with User B → allowed
- [ ] User C (non-member) reads chat → denied
- [ ] User C creates message in chat → denied
- [ ] User A lists chats via `memberIds` query → only own chats returned

---

## 3. Message Create (Client)

- [ ] User A sends text message with `senderId = A` → allowed
- [ ] User A sends message with `senderId = B` → denied by rules
- [ ] Text message with `readBy: [B]` on create → denied
- [ ] Text message with `sideEffectsStatus` field → denied

---

## 4. Cloud Function — Message Side Effects

After User A sends a text message, verify in Firebase Console:

- [ ] `chats/{id}.lastMessage` updated to message text (truncated)
- [ ] `chats/{id}.lastMessageAt` set
- [ ] `chats/{id}.lastMessageSenderId` = User A
- [ ] `chats/{id}.unreadCounts[B]` incremented by 1
- [ ] `chats/{id}.unreadCounts[A]` unchanged
- [ ] `messages/{id}.sideEffectsStatus` = `"applied"`

### Old chat compatibility

- [ ] Chat document without `unreadCounts` field → after first message, counts appear and increment correctly

---

## 5. Client Cannot Modify Chat Metadata

Attempt from browser devtools or rules playground as User A:

- [ ] Direct update to `chats/{id}` `lastMessage` → **denied**
- [ ] Direct update to `chats/{id}` `unreadCounts` → **denied**
- [ ] Direct update to `chats/{id}` `updatedAt` → **denied**

---

## 6. Read Receipts & Unread Clear

- [ ] User B opens chat; `readBy` on unread messages includes B → allowed
- [ ] User B cannot add User A to `readBy` → denied
- [ ] After B reads, `onMessageReadReceipt` sets `unreadCounts[B] = 0`
- [ ] Sidebar unread badge for User B clears after read
- [ ] Sidebar header shows total unread sum across chats

---

## 7. Image Messages & Storage

- [ ] User A uploads image via app → Storage path `chatUploads/{chatId}/{A}/{timestamp}_...`
- [ ] Message doc contains matching `storagePath` and `imageUrl`
- [ ] Function sets `sideEffectsStatus: applied`
- [ ] User A creates image message with fake external `imageUrl` only → function rejects
- [ ] User A creates image with `storagePath` under B's UID segment → denied by rules
- [ ] Upload 15 MB file → denied by Storage rules
- [ ] Upload PDF → denied by Storage rules

---

## 8. Rate Limiting

- [ ] Send 30+ messages in 60 seconds as one user → `sideEffectsStatus: rate_limited`
- [ ] Send 15+ messages in one chat within 60s → `chat_rate_limit`
- [ ] Send 5+ messages in 10s burst → `burst_rate_limit`
- [ ] Send identical text twice within 10s → `duplicate_message`
- [ ] Chat metadata does not increment unread for rate-limited messages
- [ ] After window expires, next message applies side effects normally

---

## 9. App Check

- [ ] App Check debug token registered for local dev
- [ ] Client writes succeed with App Check initialized
- [ ] Rules playground write without `request.app` → denied
- [ ] Console shows App Check metrics for the web app

---

## 10. Push Notifications (FCM)

- [ ] `NEXT_PUBLIC_FIREBASE_VAPID_KEY` set
- [ ] User grants notification permission → token saved under `users/{uid}/fcmTokens/`
- [ ] User A sends message; User B (background tab) receives push notification
- [ ] Clicking notification opens `/chat?open={chatId}` and selects the chat
- [ ] Sender does not receive push for own message

---

## 11. Duplicate Direct Chat

- [ ] User A starts chat with B twice → same `chatId` returned
- [ ] No duplicate direct chat documents created

---

## 12. Typing Indicators

- [ ] User A writes own typing doc → allowed
- [ ] User A writes typing doc for User B's UID → denied
- [ ] Non-member writes typing doc → denied

---

## 13. UI Polish

- [ ] Own messages show "Sending" until `sideEffectsStatus: applied`
- [ ] Failed/rate-limited messages show delivery label
- [ ] Focus states visible on buttons and chat rows (keyboard nav)
- [ ] `[ Notify ]` prompt appears when permission is `default`

---

## 14. Emulator Testing (Optional)

```bash
firebase emulators:start --only firestore,functions,storage,auth
```

- [ ] Point app to emulators
- [ ] Run sections 3–8 against local functions
- [ ] Confirm function logs show validation and transaction success

---

## Sign-off

| Area | Tester | Date | Pass/Fail |
|------|--------|------|-----------|
| Firestore rules | | | |
| Storage rules | | | |
| App Check | | | |
| onMessageCreated | | | |
| onMessageReadReceipt | | | |
| FCM push | | | |
| Client regression | | | |
