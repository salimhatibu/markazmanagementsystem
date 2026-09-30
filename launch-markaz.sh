#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"
URL="http://localhost:5173/"

if ! command -v node >/dev/null 2>&1; then
  echo "Install Node.js 22 or newer, then click this file again."
  exit 1
fi

if [[ ! -d node_modules ]]; then
  echo "Installing packages once…"
  npm install
fi

already_up=0
if command -v curl >/dev/null 2>&1 && curl -sf -o /dev/null "$URL"; then
  already_up=1
fi

open_site() {
  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$URL" >/dev/null 2>&1 || true
  elif command -v gio >/dev/null 2>&1; then
    gio open "$URL" >/dev/null 2>&1 || true
  fi
}

if [[ "$already_up" -eq 1 ]]; then
  open_site
  exit 0
fi

npm run dev &
dev_pid=$!

for _ in $(seq 1 50); do
  if command -v curl >/dev/null 2>&1 && curl -sf -o /dev/null "$URL"; then
    open_site
    wait "$dev_pid"
    exit 0
  fi
  sleep 0.4
done

echo "The local site did not come up on $URL"
kill "$dev_pid" >/dev/null 2>&1 || true
exit 1
