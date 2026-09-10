#!/usr/bin/env bash
set -e

echo "=== Kursor: Configuring Linux /dev/uinput permissions ==="

# Ensure uinput kernel module is loaded
echo "Loading uinput kernel module..."
sudo modprobe uinput

# Ensure module loads automatically at boot
if [ -d /etc/modules-load.d ]; then
    echo "uinput" | sudo tee /etc/modules-load.d/kursor-uinput.conf > /dev/null
fi

# Add udev rule to allow members of the 'input' group to access /dev/uinput
echo "Installing udev rule in /etc/udev/rules.d/99-kursor-uinput.rules..."
cat << 'EOF' | sudo tee /etc/udev/rules.d/99-kursor-uinput.rules > /dev/null
KERNEL=="uinput", GROUP="input", MODE="0660", OPTIONS+="static_node=uinput"
EOF

# Reload udev rules
echo "Reloading udev rules..."
sudo udevadm control --reload-rules
sudo udevadm trigger

# Add current user to input group
echo "Adding user '$USER' to 'input' group..."
sudo usermod -aG input "$USER"

# Apply permissions to current session if device exists
if [ -e /dev/uinput ]; then
    sudo chmod 0660 /dev/uinput
    sudo chgrp input /dev/uinput
fi

echo ""
echo "Configuration complete."
echo "Note: If you were just added to the 'input' group, log out and log back in (or run 'newgrp input') for changes to take effect."
