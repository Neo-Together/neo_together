#!/bin/bash
# Start the web app for testing
# Copies to ~/neo_together to avoid polluting Dropbox
# Everything here can be regenerated - safe to wipe on reboot

DROPBOX_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DEV_DIR="$HOME/neo_together"

echo "Preparing app..."

# Clean and copy code from Dropbox to local dev folder
rm -rf "$DEV_DIR"
mkdir -p "$DEV_DIR"
cp -r "$DROPBOX_DIR/frontend" "$DEV_DIR/"
cp -r "$DROPBOX_DIR/backend" "$DEV_DIR/"
cp -r "$DROPBOX_DIR/scripts" "$DEV_DIR/"
cp "$DROPBOX_DIR/docker-compose.yml" "$DEV_DIR/"

# Remove any generated files that might have been copied
rm -rf "$DEV_DIR/frontend/node_modules" "$DEV_DIR/frontend/dist" "$DEV_DIR/frontend/android" 2>/dev/null
rm -rf "$DEV_DIR/backend/__pycache__" "$DEV_DIR/backend/.venv" 2>/dev/null

cd "$DEV_DIR"

echo "Starting services..."
podman compose up -d --build

echo "Waiting for services to start..."
sleep 15

# Check if services are running
if ! podman ps | grep -q neo_together_frontend; then
    echo "Something went wrong. Checking logs..."
    podman compose logs --tail 20
    exit 1
fi

# Check if database needs seeding (first run or after wipe)
echo "Checking database..."
TABLES=$(podman exec neo_together_db psql -U postgres -d neo_together -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')

if [ "$TABLES" = "0" ] || [ -z "$TABLES" ]; then
    echo "Setting up database (first run)..."
    sleep 5
    podman exec neo_together_backend python -c "from app.database import engine, Base; import asyncio; from app.models import *; asyncio.run(Base.metadata.create_all(engine))" 2>/dev/null
    podman exec neo_together_backend python -m app.seed --with-test-users 2>/dev/null
    echo "Database ready with test users."
fi

echo ""
echo "Ready! Open your browser to:"
echo "  http://localhost:5173"
echo ""
echo "To stop: ./scripts/stop.sh"
