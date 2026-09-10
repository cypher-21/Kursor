#!/usr/bin/env bash
set -e

echo "=============================================="
echo "    Kursor Desktop Server - Linux Installer    "
echo "=============================================="

# Detect package manager
if command -v apt-get &>/dev/null; then
    echo "[1/4] Installing system dependencies (APT / Ubuntu / Debian)..."
    sudo apt-get update -y
    sudo apt-get install -y python3-pip python3-evdev python3-tk python3-pil python3-pil.imagetk ydotool playerctl pulseaudio-utils libnotify-bin
elif command -v dnf &>/dev/null; then
    echo "[1/4] Installing system dependencies (DNF / Fedora)..."
    sudo dnf install -y python3-pip python3-evdev python3-tkinter python3-pillow-tk ydotool playerctl pulseaudio-utils libnotify
elif command -v pacman &>/dev/null; then
    echo "[1/4] Installing system dependencies (Pacman / Arch Linux)..."
    sudo pacman -Sy --noconfirm python-pip python-evdev tk python-pillow ydotool playerctl libpulse libnotify
else
    echo "[1/4] Warning: Unrecognized package manager. Please ensure Python 3, evdev, and tkinter are installed."
fi

# Install Python requirements
echo "[2/4] Installing Python dependencies..."
python3 -m pip install -r requirements.txt --break-system-packages 2>/dev/null || python3 -m pip install -r requirements.txt

# Run uinput setup
echo "[3/4] Configuring Linux kernel /dev/uinput permissions..."
bash ./setup-uinput.sh

# Create local launcher script
mkdir -p "$HOME/.local/bin"
SCRIPT_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cat << EOF > "$HOME/.local/bin/kursor"
#!/usr/bin/env bash
exec python3 "$SCRIPT_PATH/main.py" "\$@"
EOF
chmod +x "$HOME/.local/bin/kursor"

# Install Desktop Entry
mkdir -p "$HOME/.local/share/applications"
cat << EOF > "$HOME/.local/share/applications/kursor.desktop"
[Desktop Entry]
Name=Kursor
Comment=Wireless trackpad & presentation receiver
Exec=$HOME/.local/bin/kursor
Icon=input-mouse
Terminal=false
Type=Application
Categories=Utility;
EOF

echo "[4/4] Installation finished successfully!"
echo ""
echo "To run Kursor:"
echo "  1. Start directly: ~/.local/bin/kursor"
echo "  2. Or run CLI daemon: ~/.local/bin/kursor --cli"
echo "  3. Or launch 'Kursor' from your application menu!"
