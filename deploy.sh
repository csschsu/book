#!/usr/bin/env bash
set -e

# Base directory of the repository
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="${1:-"$ROOT_DIR/deploy"}"

echo "======================================================="
echo "  Deploying Booking Project"
echo "  Source: $ROOT_DIR"
echo "  Target: $DEPLOY_DIR"
echo "  (Note: Database booking_system.db is NOT deployed)"
echo "======================================================="

# 1. Build Spring Boot Backend
echo ""
echo "--- [1/4] Building Spring Boot Backend (bookingweb) ---"
cd "$ROOT_DIR"
mvn clean package -DskipTests

WAR_SRC="$ROOT_DIR/bookingweb/target/bookingweb-1.0-SNAPSHOT.war"
if [ ! -f "$WAR_SRC" ]; then
  echo "Error: Backend build artifact not found at $WAR_SRC" >&2
  exit 1
fi

# 2. Build Vite Frontend
echo ""
echo "--- [2/4] Building Vite Frontend (bookingapp) ---"
cd "$ROOT_DIR/bookingapp"
if [ ! -d "node_modules" ]; then
  echo "Installing frontend dependencies..."
  npm install
fi
npm run build

# 3. Create Deploy Structure
echo ""
echo "--- [3/4] Assembling Deploy Directory at $DEPLOY_DIR ---"
mkdir -p "$DEPLOY_DIR/bookingweb"
mkdir -p "$DEPLOY_DIR/bookingapp"
mkdir -p "$DEPLOY_DIR/logs"

# Ensure NO database file is in deploy
rm -f "$DEPLOY_DIR/booking_system.db" "$DEPLOY_DIR/bookingweb/booking_system.db" "$DEPLOY_DIR/book_system.db" "$DEPLOY_DIR/bookingweb/book_system.db"

# Copy Backend Artifact
cp "$WAR_SRC" "$DEPLOY_DIR/bookingweb/bookingweb.war"

# Copy Frontend Files
cp -r "$ROOT_DIR/bookingapp/dist" "$DEPLOY_DIR/bookingapp/"
cp -r "$ROOT_DIR/bookingapp/src" "$DEPLOY_DIR/bookingapp/"
cp "$ROOT_DIR/bookingapp/index.html" "$DEPLOY_DIR/bookingapp/"
cp "$ROOT_DIR/bookingapp/package.json" "$DEPLOY_DIR/bookingapp/"
cp "$ROOT_DIR/bookingapp/package-lock.json" "$DEPLOY_DIR/bookingapp/"
cp "$ROOT_DIR/bookingapp/tsconfig.json" "$DEPLOY_DIR/bookingapp/"
cp "$ROOT_DIR/bookingapp/tsconfig.node.json" "$DEPLOY_DIR/bookingapp/"

# Generate Production vite.config.ts in deploy directory ONLY (port 3001, proxy 9091, allowedHosts)
cat << 'INNER_EOF' > "$DEPLOY_DIR/bookingapp/vite.config.ts"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    host: '0.0.0.0',
    strictPort: true,
    allowedHosts: ['book.systemkonstruktion.se', '.systemkonstruktion.se', 'localhost', '127.0.0.1'],
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:9091',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  preview: {
    port: 3001,
    host: '0.0.0.0',
    strictPort: true,
    allowedHosts: ['book.systemkonstruktion.se', '.systemkonstruktion.se', 'localhost', '127.0.0.1'],
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:9091',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
INNER_EOF

echo "Copying frontend node_modules for standalone portability..."
cp -r "$ROOT_DIR/bookingapp/node_modules" "$DEPLOY_DIR/bookingapp/"

# 4. Generate Deploy Scripts
echo ""
echo "--- [4/4] Creating Run and Management Scripts ---"

# 4a. Backend run script inside deploy/bookingweb/run.sh (port 9091)
cat << 'INNER_EOF' > "$DEPLOY_DIR/bookingweb/run.sh"
#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

PORT="${SERVER_PORT:-9091}"

echo "Starting Spring Boot Backend on http://localhost:$PORT ..."
exec java -jar bookingweb.war --server.port="$PORT" < /dev/null
INNER_EOF
chmod +x "$DEPLOY_DIR/bookingweb/run.sh"

# 4b. Frontend run script inside deploy/bookingapp/run.sh (port 3001)
cat << 'INNER_EOF' > "$DEPLOY_DIR/bookingapp/run.sh"
#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

PORT="${VITE_PORT:-3001}"
BACKEND_PORT="${SERVER_PORT:-9091}"
export VITE_BACKEND_URL="http://localhost:$BACKEND_PORT"
export CI=true

if [ ! -d "node_modules" ]; then
  echo "node_modules not found. Running npm install..."
  npm install
fi

echo "Starting Vite at http://localhost:$PORT (proxying /api -> $VITE_BACKEND_URL) on 0.0.0.0 ..."
if [ -d "dist" ]; then
  exec npx vite preview --port "$PORT" --host 0.0.0.0 < /dev/null
else
  exec npx vite --port "$PORT" --host 0.0.0.0 < /dev/null
fi
INNER_EOF
chmod +x "$DEPLOY_DIR/bookingapp/run.sh"

# 4c. Main deploy/run.sh script (runs in background without requiring open terminal window)
cat << 'INNER_EOF' > "$DEPLOY_DIR/run.sh"
#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

mkdir -p "$SCRIPT_DIR/logs"

BACKEND_PORT="${SERVER_PORT:-9091}"
FRONTEND_PORT="${VITE_PORT:-3001}"
export SERVER_PORT="$BACKEND_PORT"
export VITE_PORT="$FRONTEND_PORT"
export VITE_BACKEND_URL="http://localhost:$BACKEND_PORT"

BACKEND_PID_FILE="$SCRIPT_DIR/.backend.pid"
FRONTEND_PID_FILE="$SCRIPT_DIR/.frontend.pid"

# Free ports and stop existing instances if running
fuser -k "${BACKEND_PORT}/tcp" 2>/dev/null || true
fuser -k "${FRONTEND_PORT}/tcp" 2>/dev/null || true
rm -f "$BACKEND_PID_FILE" "$FRONTEND_PID_FILE"
sleep 1

echo "======================================================="
echo "  Starting Production Services in Background"
echo "  Backend:  http://localhost:$BACKEND_PORT"
echo "  Frontend: http://localhost:$FRONTEND_PORT"
echo "======================================================="

# Start Spring Boot in background with setsid
cd "$SCRIPT_DIR/bookingweb"
setsid ./run.sh < /dev/null > "$SCRIPT_DIR/logs/backend.log" 2>&1 &
BACKEND_PID=$!
echo "$BACKEND_PID" > "$BACKEND_PID_FILE"
echo "-> Spring Boot started in background (PID: $BACKEND_PID)"

# Start Vite in background with setsid
cd "$SCRIPT_DIR/bookingapp"
setsid ./run.sh < /dev/null > "$SCRIPT_DIR/logs/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo "$FRONTEND_PID" > "$FRONTEND_PID_FILE"
echo "-> Vite started in background (PID: $FRONTEND_PID)"

echo ""
echo "Waiting for services to initialize..."
sleep 4

# Check status via status.sh
"$SCRIPT_DIR/status.sh"

echo ""
echo "======================================================="
echo "  Services are running in background!"
echo "  Frontend URL: http://localhost:$FRONTEND_PORT"
echo "  Allowed Host: http://book.systemkonstruktion.se"
echo "  Backend API:  http://localhost:$BACKEND_PORT"
echo ""
echo "  To view logs:    tail -f logs/backend.log logs/frontend.log"
echo "  To check status: ./status.sh"
echo "  To stop:         ./stop.sh"
echo "======================================================="
INNER_EOF
chmod +x "$DEPLOY_DIR/run.sh"

# 4d. Stop script deploy/stop.sh
cat << 'INNER_EOF' > "$DEPLOY_DIR/stop.sh"
#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PID_FILE="$SCRIPT_DIR/.backend.pid"
FRONTEND_PID_FILE="$SCRIPT_DIR/.frontend.pid"
BACKEND_PORT="${SERVER_PORT:-9091}"
FRONTEND_PORT="${VITE_PORT:-3001}"

echo "=== Stopping Deployed Services ==="

if [ -f "$BACKEND_PID_FILE" ]; then
  PID=$(cat "$BACKEND_PID_FILE" 2>/dev/null)
  if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
    echo "Stopping Spring Boot process (PID $PID)..."
    kill "$PID" 2>/dev/null || true
  fi
  rm -f "$BACKEND_PID_FILE"
fi

if [ -f "$FRONTEND_PID_FILE" ]; then
  PID=$(cat "$FRONTEND_PID_FILE" 2>/dev/null)
  if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
    echo "Stopping Vite process (PID $PID)..."
    kill "$PID" 2>/dev/null || true
  fi
  rm -f "$FRONTEND_PID_FILE"
fi

# Kill any remaining processes listening on ports
fuser -k "${BACKEND_PORT}/tcp" 2>/dev/null || true
fuser -k "${FRONTEND_PORT}/tcp" 2>/dev/null || true

echo "All services stopped."
INNER_EOF
chmod +x "$DEPLOY_DIR/stop.sh"

# 4e. Status script deploy/status.sh
cat << 'INNER_EOF' > "$DEPLOY_DIR/status.sh"
#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PORT="${SERVER_PORT:-9091}"
FRONTEND_PORT="${VITE_PORT:-3001}"

echo "=== Service Status ==="

# Check Backend
if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$BACKEND_PORT/book" | grep -q "200\|401\|403"; then
  echo "[OK] Spring Boot is RUNNING at http://localhost:$BACKEND_PORT"
else
  echo "[DOWN] Spring Boot is NOT responding on http://localhost:$BACKEND_PORT"
fi

# Check Frontend
if curl -s -o /dev/null -w "%{http_code}" -H "Host: book.systemkonstruktion.se" "http://localhost:$FRONTEND_PORT" | grep -q "200\|304"; then
  echo "[OK] Vite Frontend is RUNNING at http://localhost:$FRONTEND_PORT (Host: book.systemkonstruktion.se)"
else
  echo "[DOWN] Vite Frontend is NOT responding on http://localhost:$FRONTEND_PORT"
fi
INNER_EOF
chmod +x "$DEPLOY_DIR/status.sh"

# 4f. Create deploy/README.md
cat << 'INNER_EOF' > "$DEPLOY_DIR/README.md"
# Deployed Production Booking System

This directory is completely self-contained and can be moved to any production location outside the source repository.

## Requirements
- Java 21+ (Java 25 tested)
- Node.js 18+ and npm

## Ports & Hosts
- **Frontend (Vite)**: `http://localhost:3001` (Allowed hosts: `book.systemkonstruktion.se`, `localhost`, etc.)
- **Backend (Spring Boot)**: `http://localhost:9091`

## Database Note
The SQLite database file `booking_system.db` is not packaged. Ensure your database file is placed in the `bookingweb/` folder or root `deploy/` directory in production.

## Starting Services (Background Daemon)

To start both Frontend and Backend in background:
```bash
./run.sh
```
This runs both processes in the background detached. You can safely close your terminal window.

To view live logs:
```bash
tail -f logs/backend.log logs/frontend.log
```

To check status:
```bash
./status.sh
```

To stop all running services:
```bash
./stop.sh
```

### Running Separately

- **Start Backend only:**
  ```bash
  cd bookingweb
  ./run.sh
  ```

- **Start Frontend only:**
  ```bash
  cd bookingapp
  ./run.sh
  ```
INNER_EOF

echo ""
echo "======================================================="
echo "  Deployment Complete!"
echo "  Deploy directory created at: $DEPLOY_DIR"
echo "  "
echo "  To test deployment in background:"
echo "    cd \"$DEPLOY_DIR\" && ./run.sh"
echo "======================================================="
