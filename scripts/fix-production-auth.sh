#!/usr/bin/env bash
# One-time production fix: deploy rules + authorized domains + frontend
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=lib/firebase-project.sh
source "$ROOT/scripts/lib/firebase-project.sh"

cd "$ROOT"

echo "→ Deploying Firestore rules..."
firebase deploy --only firestore:rules --project "$FIREBASE_PROJECT"

if command -v gcloud >/dev/null 2>&1; then
  echo "→ Updating Auth authorized domains..."
  TOKEN=$(gcloud auth print-access-token --project="$FIREBASE_PROJECT")
  CONFIG=$(curl -s \
    -H "Authorization: Bearer $TOKEN" \
    -H "x-goog-user-project: $FIREBASE_PROJECT" \
    "https://identitytoolkit.googleapis.com/admin/v2/projects/$FIREBASE_PROJECT/config")

  DOMAINS=$(node -e "
    const cfg = JSON.parse(process.argv[1]);
    const set = new Set(cfg.authorizedDomains || []);
    for (const d of ['localhost','127.0.0.1','ghosttoghost.firebaseapp.com','ghosttoghost.web.app']) {
      set.add(d);
    }
    console.log(JSON.stringify([...set].sort()));
  " "$CONFIG")

  curl -s -X PATCH \
    "https://identitytoolkit.googleapis.com/admin/v2/projects/$FIREBASE_PROJECT/config?updateMask=authorizedDomains" \
    -H "Authorization: Bearer $TOKEN" \
    -H "x-goog-user-project: $FIREBASE_PROJECT" \
    -H "Content-Type: application/json" \
    -d "{\"authorizedDomains\":$DOMAINS}"

  echo ""
  echo "→ Enabling Anonymous sign-in..."
  curl -s -X PATCH \
    "https://identitytoolkit.googleapis.com/admin/v2/projects/$FIREBASE_PROJECT/config?updateMask=signIn.anonymous.enabled" \
    -H "Authorization: Bearer $TOKEN" \
    -H "x-goog-user-project: $FIREBASE_PROJECT" \
    -H "Content-Type: application/json" \
    -d '{"signIn":{"anonymous":{"enabled":true}}}'

  echo ""
else
  echo "⚠ gcloud not found — add ghosttoghost.web.app manually in Firebase Console → Authentication → Settings → Authorized domains"
fi

echo "→ Deploying frontend..."
npm run deploy:frontend

echo ""
echo "✓ Done. Open https://ghosttoghost.web.app in a private window and sign up again."
