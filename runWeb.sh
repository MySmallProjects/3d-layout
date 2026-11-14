#!/usr/bin/env bash
set -e

# Determine the project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Verify Node.js and npm are present
if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js was not found in PATH."
  echo "Please install Node.js: sudo apt install nodejs npm"
  exit 1
fi

echo "Using system Node: $(node -v) (npm $(npm -v))"
echo ""

MODE="${1:-dev}"

if [ "$MODE" = "prod" ] || [ "$MODE" = "--prod" ]; then
  echo "Starting 3D Scene Composer in PRODUCTION mode..."
  echo "Server & Client will be available at: http://localhost:3001"
  echo ""
  npm run start
else
  echo "Starting 3D Scene Composer in DEVELOPMENT mode..."
  echo "Frontend: http://localhost:3000"
  echo "Backend:  http://localhost:3001"
  echo ""
  echo "Tip: Run './runWeb.sh prod' to run the production build instead."
  echo ""
  npm run dev
fi
