#!/bin/bash

# LinkedIn Messenger Runner - macOS Uninstall Script

echo "LinkedIn Messenger Runner - macOS Uninstall"
echo "==========================================="

LAUNCHAGENT_PLIST="$HOME/Library/LaunchAgents/com.linkedin-messenger.runner.plist"

# Unload if running
if launchctl list | grep -q "com.linkedin-messenger.runner"; then
    echo "Stopping runner..."
    launchctl unload "$LAUNCHAGENT_PLIST"
fi

# Remove plist
if [ -f "$LAUNCHAGENT_PLIST" ]; then
    echo "Removing LaunchAgent..."
    rm "$LAUNCHAGENT_PLIST"
    echo "✅ Runner uninstalled successfully!"
else
    echo "Runner LaunchAgent not found."
fi

echo ""
echo "Note: Session data and logs are preserved at:"
echo "  Sessions: ~/.linkedin-runner/sessions"
echo "  Logs: ~/Library/Logs/linkedin-runner*.log"
echo ""
echo "To remove these as well, run:"
echo "  rm -rf ~/.linkedin-runner"
echo "  rm ~/Library/Logs/linkedin-runner*.log"