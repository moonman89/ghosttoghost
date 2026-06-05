#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=lib/firebase-project.sh
source "$ROOT/scripts/lib/firebase-project.sh"

cd "$ROOT"
npm --prefix functions run build
firebase deploy --only functions --project "$FIREBASE_PROJECT"
