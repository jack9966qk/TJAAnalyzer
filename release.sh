#!/bin/bash
set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <version>"
    echo "Example: $0 v1.0.0"
    exit 1
fi

VERSION=$1

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

echo "Starting release build for version $VERSION..."

# Clean previous builds
echo "Cleaning release directory..."
rm -rf release

# Run the build script
echo "Running npm run build:exe..."
npm run build:exe

# Create zip archives
echo "Creating zip archives..."

# Mac x64
if [ -d "release/mac_x64/TJAAnalyzer.app" ]; then
    echo "Zipping Mac x64..."
    cd release/mac_x64
    zip -r -q "../../TJAAnalyzer-mac-x64-$VERSION.zip" "TJAAnalyzer.app"
    cd ../..
fi

# Mac arm64
if [ -d "release/mac_arm64/TJAAnalyzer.app" ]; then
    echo "Zipping Mac arm64..."
    cd release/mac_arm64
    zip -r -q "../../TJAAnalyzer-mac-arm64-$VERSION.zip" "TJAAnalyzer.app"
    cd ../..
fi

# Mac universal
if [ -d "release/mac_universal/TJAAnalyzer.app" ]; then
    echo "Zipping Mac universal..."
    cd release/mac_universal
    zip -r -q "../../TJAAnalyzer-mac-universal-$VERSION.zip" "TJAAnalyzer.app"
    cd ../..
fi

# Windows x64
if [ -d "release/win_x64" ]; then
    echo "Zipping Windows x64..."
    cd release
    zip -r -q "../TJAAnalyzer-win-x64-$VERSION.zip" "win_x64"
    cd ..
fi

# Linux x64
if [ -d "release/linux_x64/TJAAnalyzer" ]; then
    echo "Zipping Linux x64..."
    cd release/linux_x64
    zip -r -q "../../TJAAnalyzer-linux-x64-$VERSION.zip" "TJAAnalyzer"
    cd ../..
fi

# Linux arm64
if [ -d "release/linux_arm64/TJAAnalyzer" ]; then
    echo "Zipping Linux arm64..."
    cd release/linux_arm64
    zip -r -q "../../TJAAnalyzer-linux-arm64-$VERSION.zip" "TJAAnalyzer"
    cd ../..
fi

# Linux armhf
if [ -d "release/linux_armhf/TJAAnalyzer" ]; then
    echo "Zipping Linux armhf..."
    cd release/linux_armhf
    zip -r -q "../../TJAAnalyzer-linux-armhf-$VERSION.zip" "TJAAnalyzer"
    cd ../..
fi

# Create GitHub release
echo "Creating GitHub release..."
gh release create "$VERSION" TJAAnalyzer-*-"$VERSION".zip --generate-notes

# Clean up the Neutralino build artifacts now that the release is published
echo "Cleaning up Neutralino build artifacts..."
rm -rf release
rm -f TJAAnalyzer-*-"$VERSION".zip

echo "Release $VERSION created successfully!"
