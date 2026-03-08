#!/bin/bash
set -e

# Package format version. Increment this when the zip structure changes in a
# breaking way (e.g. new required files, renamed paths). The app fetches the
# tag for the format version it supports, so old app versions keep working
# against their own tag when the format changes.
FORMAT_VERSION=1

# Fixed tag per format version. Must not match the app version tag pattern (v*)
# so that app release --generate-notes is not affected.
# Marked as prerelease so GitHub skips it when auto-generating app release changelogs.
TAG="data-v${FORMAT_VERSION}-latest"
ARCHIVE="ese-data.zip"

# Check if gh is installed
if ! command -v gh &> /dev/null; then
    echo "Error: GitHub CLI (gh) is not installed."
    exit 1
fi

# Check if zip is installed
if ! command -v zip &> /dev/null; then
    echo "Error: zip is not installed."
    exit 1
fi

# Verify data is present
if [ ! -d "public/ese" ] || [ -z "$(ls -A public/ese)" ]; then
    echo "Error: public/ese is missing or empty. Run 'npm run prepare-data' first."
    exit 1
fi

if [ ! -f "public/ese_index.json" ]; then
    echo "Error: public/ese_index.json is missing. Run 'npm run build-data' first."
    exit 1
fi

if [ ! -f "data/song_mapping.json" ]; then
    echo "Error: data/song_mapping.json is missing."
    exit 1
fi

echo "Packaging ESE data..."
rm -f "$ARCHIVE"

# Write a manifest so the app can check format compatibility before consuming
# the full archive. Kept at the zip root as data-manifest.json.
# Using a fixed path ensures the in-zip name is always "data-manifest.json"
# when added with -j (junk paths).
MANIFEST_TMP="/tmp/data-manifest.json"
printf '{"formatVersion":%d}\n' "$FORMAT_VERSION" > "$MANIFEST_TMP"

# Package files so paths inside the zip match the app's fetch URLs:
#   ese/<category>/<song>/<file>.tja
#   ese_index.json
#   data/song_mapping.json
cd public && zip -r -q "../$ARCHIVE" ese/ ese_index.json && cd ..
zip -q "$ARCHIVE" data/song_mapping.json
# Add manifest at zip root (-j strips the /tmp/ prefix)
zip -j -q "$ARCHIVE" "$MANIFEST_TMP"
rm -f "$MANIFEST_TMP"

echo "Archive size: $(du -sh "$ARCHIVE" | cut -f1)"

# Delete existing data release if present (we reuse the fixed tag)
echo "Updating GitHub release '$TAG'..."
gh release delete "$TAG" --yes 2>/dev/null || true

# Create the data release as a prerelease so it is excluded from app changelog generation
gh release create "$TAG" "$ARCHIVE" \
    --title "ESE Data Package" \
    --notes "ESE chart data package for offline support (format version $FORMAT_VERSION)." \
    --prerelease

echo "ESE data package uploaded successfully!"
rm -f "$ARCHIVE"

# Update the format-version pointer release so the app can discover the latest
# format version without knowing it in advance. The app fetches data-pointer's
# data-manifest.json, compares formatVersion with what it supports, and can
# prompt the user to update if the current format is newer than it understands.
POINTER_TAG="data-pointer"
MANIFEST_TMP="/tmp/data-manifest.json"
printf '{"formatVersion":%d}\n' "$FORMAT_VERSION" > "$MANIFEST_TMP"

echo "Updating format-version pointer release '$POINTER_TAG'..."
gh release delete "$POINTER_TAG" --yes 2>/dev/null || true
gh release create "$POINTER_TAG" "$MANIFEST_TMP" \
    --title "ESE Data Package (latest format pointer)" \
    --notes "Pointer release that contains only the latest format version (v$FORMAT_VERSION) in \`data-manifest.json\`." \
    --prerelease
rm -f "$MANIFEST_TMP"
echo "Format-version pointer updated."
