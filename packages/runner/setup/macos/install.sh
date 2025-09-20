#!/bin/bash

# LinkedIn Messenger Runner - macOS Installation Script

echo "LinkedIn Messenger Runner - macOS Installation"
echo "=============================================="

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "Error: This script is for macOS only."
    exit 1
fi

# Get the project root directory
PROJECT_ROOT="$(cd "$(dirname "$0")/../../../../" && pwd)"
RUNNER_DIR="$PROJECT_ROOT/packages/runner"
PLIST_FILE="$PROJECT_ROOT/packages/runner/setup/macos/com.linkedin-messenger.runner.plist"
LAUNCHAGENT_DIR="$HOME/Library/LaunchAgents"
TARGET_PLIST="$LAUNCHAGENT_DIR/com.linkedin-messenger.runner.plist"

echo "Project root: $PROJECT_ROOT"
echo "Runner directory: $RUNNER_DIR"

# Check if runner is built
if [ ! -f "$RUNNER_DIR/dist/index.js" ]; then
    echo "Building runner..."
    cd "$RUNNER_DIR"
    npm install
    npm run build
    cd - > /dev/null
fi

# Create LaunchAgents directory if it doesn't exist
mkdir -p "$LAUNCHAGENT_DIR"

# Copy and configure plist
echo "Installing LaunchAgent..."
cp "$PLIST_FILE" "$TARGET_PLIST"

# Replace placeholders in plist
sed -i '' "s|/Users/johnconnor/Documents/GitHub/Linkedin-messenger|$PROJECT_ROOT|g" "$TARGET_PLIST"
sed -i '' "s|/Users/johnconnor|$HOME|g" "$TARGET_PLIST"

# Check if Node.js is installed at expected location
NODE_PATH="/usr/local/bin/node"
if [ ! -f "$NODE_PATH" ]; then
    # Try to find node
    NODE_PATH="$(which node)"
    if [ -z "$NODE_PATH" ]; then
        echo "Error: Node.js not found. Please install Node.js first."
        exit 1
    fi
    echo "Using Node.js at: $NODE_PATH"
    sed -i '' "s|/usr/local/bin/node|$NODE_PATH|g" "$TARGET_PLIST"
fi

# Create log directory
mkdir -p "$HOME/Library/Logs"

# Load the LaunchAgent
echo "Loading LaunchAgent..."
launchctl unload "$TARGET_PLIST" 2>/dev/null
launchctl load "$TARGET_PLIST"

# Check status
if launchctl list | grep -q "com.linkedin-messenger.runner"; then
    echo "✅ Runner installed successfully!"
    echo ""
    echo "The runner will start automatically on login."
    echo "To check status: launchctl list | grep linkedin-messenger"
    echo "To view logs: tail -f ~/Library/Logs/linkedin-runner.log"
    echo "To stop: launchctl unload $TARGET_PLIST"
    echo "To start: launchctl load $TARGET_PLIST"
else
    echo "❌ Installation failed. Please check the logs."
    exit 1
fi