#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=lib/firebase-project.sh
source "$ROOT/scripts/lib/firebase-project.sh"

cd "$ROOT"
bash scripts/generate-messaging-sw.sh
npm run build
firebase deploy --only hosting --project "$FIREBASE_PROJECT"
