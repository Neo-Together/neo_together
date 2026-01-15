#!/bin/bash
# Stop the web app

DEV_DIR="$HOME/neo_together"

echo "Stopping Neo Together..."
cd "$DEV_DIR" 2>/dev/null && podman compose down 2>/dev/null

echo "Stopped."
