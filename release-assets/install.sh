#!/usr/bin/env bash
set -euo pipefail

echo "Installing ReplyLane via npm..."
npm install -g @talocode/replylane
echo "Installed. Run: replylane --help"