#!/bin/bash
# Build Android app
# Copies to ~/neo_together to avoid polluting Dropbox

DROPBOX_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DEV_DIR="$HOME/neo_together"

echo "Preparing build..."

# Clean and copy code from Dropbox to local dev folder
rm -rf "$DEV_DIR"
mkdir -p "$DEV_DIR"
cp -r "$DROPBOX_DIR/frontend" "$DEV_DIR/"
cp -r "$DROPBOX_DIR/backend" "$DEV_DIR/"
cp "$DROPBOX_DIR/docker-compose.yml" "$DEV_DIR/"

# Remove any generated files
rm -rf "$DEV_DIR/frontend/node_modules" "$DEV_DIR/frontend/dist" "$DEV_DIR/frontend/android" 2>/dev/null

cd "$DEV_DIR"

echo "Building Android app (this may take a few minutes the first time)..."

# Build the container and APK
podman build -t neo-together-android -f frontend/Dockerfile.android frontend/
podman run --rm -v "$DEV_DIR/frontend:/app:Z" neo-together-android \
    sh -c "npm run build && npx cap add android 2>/dev/null; npx cap sync android && cd android && ./gradlew assembleDebug"

APK_PATH="$DEV_DIR/frontend/android/app/build/outputs/apk/debug/app-debug.apk"

if [ -f "$APK_PATH" ]; then
    # Copy APK back to Dropbox for easy access
    mkdir -p "$DROPBOX_DIR/builds"
    cp "$APK_PATH" "$DROPBOX_DIR/builds/neo-together.apk"

    echo ""
    echo "Success! Your Android app is ready."
    echo ""
    echo "APK location: $DROPBOX_DIR/builds/neo-together.apk"
    echo ""
    echo "To install on your phone:"
    echo "  1. Connect your phone via USB"
    echo "  2. Copy the APK file to your phone"
    echo "  3. Open the file on your phone to install"
else
    echo ""
    echo "Something went wrong. Check the output above for errors."
fi
