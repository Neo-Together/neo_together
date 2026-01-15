#!/bin/bash
# Build Android APK using Podman
# Usage: ./scripts/android-build.sh [debug|release]

set -e

BUILD_TYPE=${1:-debug}
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "Building Android APK ($BUILD_TYPE)..."

# Build the container
podman build -t neo-together-android -f frontend/Dockerfile.android frontend/

# Run the build
if [ "$BUILD_TYPE" = "release" ]; then
    podman run --rm -v "$PROJECT_ROOT/frontend:/app:Z" neo-together-android \
        sh -c "npm run build && npx cap sync android && cd android && ./gradlew assembleRelease"
    echo "Release APK: frontend/android/app/build/outputs/apk/release/"
else
    podman run --rm -v "$PROJECT_ROOT/frontend:/app:Z" neo-together-android \
        sh -c "npm run build && npx cap sync android && cd android && ./gradlew assembleDebug"
    echo "Debug APK: frontend/android/app/build/outputs/apk/debug/"
fi

echo "Done!"
