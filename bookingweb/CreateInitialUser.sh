#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check if database file exists before doing anything
DB_FOUND=0
if [ -f "$SCRIPT_DIR/booking_system.db" ] || [ -f "$SCRIPT_DIR/bookingweb/booking_system.db" ] || [ -f "$SCRIPT_DIR/../booking_system.db" ]; then
  DB_FOUND=1
fi

if [ "$DB_FOUND" -eq 0 ]; then
  echo "ERROR: booking_system.db not found in $SCRIPT_DIR or its subdirectories." >&2
  echo "Aborting. Please provide your booking_system.db file before running CreateInitialUser." >&2
  exit 1
fi

# Locate WAR file
WAR_FILE=""
if [ -f "$SCRIPT_DIR/bookingweb/target/bookingweb-1.0-SNAPSHOT.war" ]; then
  WAR_FILE="$SCRIPT_DIR/bookingweb/target/bookingweb-1.0-SNAPSHOT.war"
elif [ -f "$SCRIPT_DIR/target/bookingweb-1.0-SNAPSHOT.war" ]; then
  WAR_FILE="$SCRIPT_DIR/target/bookingweb-1.0-SNAPSHOT.war"
elif [ -f "$SCRIPT_DIR/bookingweb/bookingweb.war" ]; then
  WAR_FILE="$SCRIPT_DIR/bookingweb/bookingweb.war"
elif [ -f "$SCRIPT_DIR/bookingweb.war" ]; then
  WAR_FILE="$SCRIPT_DIR/bookingweb.war"
fi

if [ -n "$WAR_FILE" ]; then
  exec java -cp "$WAR_FILE" \
    -Dloader.path=WEB-INF/classes,WEB-INF/lib \
    -Dloader.main=org.community.booking.CreateInitialUser \
    org.springframework.boot.loader.launch.PropertiesLauncher "$@"
else
  # Fallback to Maven if running in dev without built WAR
  if [ -d "$SCRIPT_DIR/bookingweb" ]; then
    cd "$SCRIPT_DIR/bookingweb"
  fi
  exec mvn exec:java \
    -Dexec.mainClass="org.community.booking.CreateInitialUser" \
    -Dexec.args="$*"
fi
