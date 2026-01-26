#!/bin/bash
set -e

REPO_URL="https://github.com/hschneider/neutralino-build-scripts.git"
COMMIT_HASH="ececd00d5fcbc78b83947db8fbab4a4b628ffd13"
TARGET_DIR="neutralino-build-scripts"
PATCH_FILE="neutralino-build-scripts.patch"

if [ ! -d "$TARGET_DIR" ]; then
    echo "Cloning $REPO_URL..."
    git clone "$REPO_URL" "$TARGET_DIR"
    cd "$TARGET_DIR"
    git checkout "$COMMIT_HASH"
    cd ..
else
    echo "$TARGET_DIR already exists. Resetting..."
    cd "$TARGET_DIR"
    git fetch origin
    git checkout "$COMMIT_HASH"
    cd ..
fi

echo "Applying patch..."
cd "$TARGET_DIR"
# Reset to clean state before applying patch
git reset --hard "$COMMIT_HASH"
git apply "../$PATCH_FILE"
echo "Patch applied successfully."
chmod +x build-*.sh
cd ..
