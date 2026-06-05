#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.env.local"
OUT="$ROOT/public/firebase-messaging-sw.js"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing .env.local. Copy .env.local.example and fill in Firebase values." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

for key in NEXT_PUBLIC_FIREBASE_API_KEY NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN NEXT_PUBLIC_FIREBASE_PROJECT_ID NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID NEXT_PUBLIC_FIREBASE_APP_ID; do
  if [[ -z "${!key:-}" ]]; then
    echo "Missing $key in .env.local" >&2
    exit 1
  fi
done

CONFIG=$(node -e "
console.log(JSON.stringify({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}));
" \
  NEXT_PUBLIC_FIREBASE_API_KEY="$NEXT_PUBLIC_FIREBASE_API_KEY" \
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN" \
  NEXT_PUBLIC_FIREBASE_PROJECT_ID="$NEXT_PUBLIC_FIREBASE_PROJECT_ID" \
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET" \
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID" \
  NEXT_PUBLIC_FIREBASE_APP_ID="$NEXT_PUBLIC_FIREBASE_APP_ID")

cat > "$OUT" <<EOF
importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging-compat.js');
firebase.initializeApp(${CONFIG});
const messaging = firebase.messaging();
messaging.onBackgroundMessage(function(payload) {
  const title = (payload.notification && payload.notification.title) || 'GhostToGhost';
  const options = {
    body: (payload.notification && payload.notification.body) || 'New message',
    data: payload.data || {},
  };
  return self.registration.showNotification(title, options);
});
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  var chatId = event.notification.data && event.notification.data.chatId;
  var url = chatId ? '/chat?open=' + chatId : '/chat';
  event.waitUntil(clients.openWindow(url));
});
EOF

echo "Wrote $OUT"
