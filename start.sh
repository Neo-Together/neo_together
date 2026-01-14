#!/bin/bash

# Neo Together - One-click launcher
# Runs entirely from ~/neo_together to avoid Dropbox sync issues
# Usage: ./start.sh

set -e

# Source directory (in Dropbox - git source only)
GIT_SOURCE_DIR="$(cd "$(dirname "$0")" && pwd)"

# Working directory (local - everything runs here)
WORK_DIR="$HOME/neo_together"

echo "======================================"
echo "   Neo Together - Starting App"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Create working directory
mkdir -p "$WORK_DIR"

# Kill any existing processes from previous runs
pkill -f "uvicorn app.main:app" 2>/dev/null || true
pkill -f "vite.*localhost" 2>/dev/null || true

# Detect container runtime (Podman or Docker)
if command -v podman &> /dev/null; then
    CONTAINER_CMD="podman"
    COMPOSE_CMD="podman-compose"
    if ! command -v podman-compose &> /dev/null; then
        COMPOSE_CMD="podman compose"
    fi
    echo "Using Podman as container runtime"
elif command -v docker &> /dev/null; then
    CONTAINER_CMD="docker"
    COMPOSE_CMD="docker compose"
    echo "Using Docker as container runtime"
else
    echo -e "${RED}Neither Docker nor Podman found. Please install one of them.${NC}"
    exit 1
fi

# Step 0: Sync source code to working directory (first run only)
if [ ! -d "$WORK_DIR/backend" ]; then
    echo -e "${YELLOW}[0/4] Syncing source code to $WORK_DIR...${NC}"
    cp -r "$GIT_SOURCE_DIR/backend" "$WORK_DIR/backend"
    cp -r "$GIT_SOURCE_DIR/frontend" "$WORK_DIR/frontend"
    cp "$GIT_SOURCE_DIR/docker-compose.yml" "$WORK_DIR/docker-compose.yml"
    echo "Source synced!"
fi

# Step 1: Start database
echo -e "${YELLOW}[1/4] Starting database...${NC}"
cd "$WORK_DIR"
$COMPOSE_CMD up -d
sleep 2

# Wait for database to be ready
echo "Waiting for database to be ready..."
until $CONTAINER_CMD exec neo_together_db pg_isready -U postgres > /dev/null 2>&1; do
    sleep 1
done
echo -e "${GREEN}Database ready!${NC}"

# Step 2: Set up backend
echo -e "${YELLOW}[2/4] Starting backend...${NC}"

# Create virtual environment if it doesn't exist
if [ ! -d "$WORK_DIR/venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv "$WORK_DIR/venv"
fi

# Activate and install dependencies
source "$WORK_DIR/venv/bin/activate"
pip install -q -r "$WORK_DIR/backend/requirements.txt"

# Initialize database tables
echo "Initializing database..."
cd "$WORK_DIR/backend"
python -c "
from app.database import engine, Base
from app.models import *
import asyncio

async def init():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

asyncio.run(init())
" 2>/dev/null

# Seed interests if empty
python -m app.seed 2>/dev/null || true

# Start backend in background
echo "Starting backend server..."
uvicorn app.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
echo $BACKEND_PID > "$WORK_DIR/.backend.pid"

# Wait for backend to be ready
sleep 2
echo -e "${GREEN}Backend ready at http://localhost:8000${NC}"

# Step 3: Start frontend
echo -e "${YELLOW}[3/4] Starting frontend...${NC}"
cd "$WORK_DIR/frontend"

# Install node_modules if needed
if [ ! -d "$WORK_DIR/frontend/node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install --legacy-peer-deps
fi

# Start frontend in background
npm run dev &
FRONTEND_PID=$!
echo $FRONTEND_PID > "$WORK_DIR/.frontend.pid"

# Wait for frontend to be ready
sleep 3
echo -e "${GREEN}Frontend ready!${NC}"

# Step 4: Done!
echo ""
echo "======================================"
echo -e "${GREEN}   App is running!${NC}"
echo "======================================"
echo ""
echo "Open your browser to:"
echo -e "${GREEN}   http://localhost:5173${NC}"
echo ""
echo "API documentation at:"
echo "   http://localhost:8000/docs"
echo ""
echo "To stop the app, run: ./stop.sh"
echo ""
echo "All files are in: $WORK_DIR"
echo ""

# Keep script running and forward signals
cd "$WORK_DIR"
wait
