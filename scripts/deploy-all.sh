#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

bash "$ROOT/scripts/deploy-backend.sh"
bash "$ROOT/scripts/deploy-frontend.sh"
