#!/bin/bash

# Neo Together - Stop all services
# Usage: ./stop.sh

WORK_DIR="$HOME/neo_together"

echo "Stopping Neo Together..."

# Stop frontend
if [ -f "$WORK_DIR/.frontend.pid" ]; then
    kill $(cat "$WORK_DIR/.frontend.pid") 2>/dev/null || true
    rm "$WORK_DIR/.frontend.pid"
    echo "Frontend stopped"
fi

# Stop backend
if [ -f "$WORK_DIR/.backend.pid" ]; then
    kill $(cat "$WORK_DIR/.backend.pid") 2>/dev/null || true
    rm "$WORK_DIR/.backend.pid"
    echo "Backend stopped"
fi

# Also kill any remaining processes on these ports
pkill -f "uvicorn app.main:app" 2>/dev/null || true
pkill -f "vite.*localhost" 2>/dev/null || true

echo "Done!"
