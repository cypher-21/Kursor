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

# Fast dependency check: only install when imports are missing (offline friendly)
if ! python3 -c "import websockets, aiohttp, qrcode, PIL, pynput" 2>/dev/null; then
    echo "[Setup] Missing Python dependencies - installing once..."
    python3 -m pip install -r requirements.txt --quiet --break-system-packages 2>/dev/null || python3 -m pip install -r requirements.txt --quiet 2>/dev/null || true
fi

# Launch Kursor server with any passed arguments (-u keeps QR/log output unbuffered)
exec python3 -u main.py "$@"
