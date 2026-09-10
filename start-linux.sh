#!/usr/bin/env bash
set -e

# Resolve script directory and navigate to server folder
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/server"

echo "=============================================="
echo "         Kursor Desktop Server (Linux)        "
echo "=============================================="

# Check for Python 3
if ! command -v python3 &>/dev/null; then
    echo "Error: python3 is not installed. Please install Python 3.9 or newer."
    exit 1
fi

# Automatically install/verify dependencies
python3 -m pip install -r requirements.txt --quiet --break-system-packages 2>/dev/null || python3 -m pip install -r requirements.txt --quiet 2>/dev/null || true

# Launch Kursor server with any passed arguments
exec python3 main.py "$@"
