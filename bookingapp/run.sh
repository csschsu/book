#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== Starting Development Frontend (bookingapp) ==="
echo "Working directory: $SCRIPT_DIR"

if [ ! -d "node_modules" ]; then
  echo "node_modules not found. Installing npm dependencies..."
  npm install
fi

echo "Starting Vite at http://localhost:5173 (Proxying /api -> http://localhost:8080)..."
exec npm run dev -- --port 5173 --host 0.0.0.0
