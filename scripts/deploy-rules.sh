#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=lib/firebase-project.sh
source "$ROOT/scripts/lib/firebase-project.sh"

cd "$ROOT"
firebase deploy --only firestore:rules,firestore:indexes,storage --project "$FIREBASE_PROJECT"
