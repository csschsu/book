#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

PORT="${SERVER_PORT:-8080}"

echo "=== Starting Development Backend (bookingweb) ==="
echo "Working directory: $SCRIPT_DIR"

# Ensure SQLite database exists in current working directory
if [ ! -f "booking_system.db" ]; then
  if [ -f "../booking_system.db" ]; then
    echo "Copying booking_system.db from parent directory..."
    cp ../booking_system.db ./
  fi
fi

# Find packaged WAR or build if missing
WAR_FILE=""
if [ -f "target/bookingweb-1.0-SNAPSHOT.war" ]; then
  WAR_FILE="target/bookingweb-1.0-SNAPSHOT.war"
elif [ -f "bookingweb-1.0-SNAPSHOT.war" ]; then
  WAR_FILE="bookingweb-1.0-SNAPSHOT.war"
elif [ -f "bookingweb.war" ]; then
  WAR_FILE="bookingweb.war"
fi

if [ -n "$WAR_FILE" ]; then
  echo "Starting Spring Boot from $WAR_FILE at http://localhost:$PORT..."
  exec java -jar "$WAR_FILE" --server.port="$PORT"
else
  echo "WAR file not found. Running with Maven on port $PORT..."
  exec mvn spring-boot:run -Dspring-boot.run.arguments="--server.port=$PORT"
fi
