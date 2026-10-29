# Kursor for Linux - Setup Guide

This guide covers installing and configuring the Kursor receiver on Linux.

## Requirements

- Python 3.9+
- Linux display session: **Wayland** (GNOME, KDE Plasma, Sway, Hyprland) or **X11**
- Kernel module: `uinput` (included in all modern Linux kernels)

---

## 1. Automated Installation

Run the provided installer script to set up system packages, Python requirements, and kernel permissions in one step:

```bash
cd server
chmod +x install.sh setup-uinput.sh start-linux.sh
./install.sh
```

---

## 2. Kernel `/dev/uinput` Permissions (Non-Root)

Kursor injects input events through the Linux kernel's `/dev/uinput` interface. This enables seamless support across both Wayland and X11 without requiring root permissions during runtime.

If you did not run `install.sh`, configure permissions manually:

```bash
cd server
chmod +x setup-uinput.sh
./setup-uinput.sh
```

This script:
1. Loads the `uinput` kernel module (`sudo modprobe uinput`).
2. Creates `/etc/udev/rules.d/99-kursor-uinput.rules`:
   ```udev
   KERNEL=="uinput", GROUP="input", MODE="0660", OPTIONS+="static_node=uinput"
   ```
3. Adds your user to the `input` group (`sudo usermod -aG input $USER`).

> [!NOTE]
> If you were just added to the `input` group, log out and log back in (or run `newgrp input`) for group changes to take effect.

> [!TIP]
> **Permissions not applied?** Kursor now ships a fallback uinput driver that opens
> `/dev/uinput` write-only (`O_WRONLY`), which the kernel accepts, so it works even on
> udev setups granting only group-*write* access (e.g. `MODE="0220"`). If the log shows
> `(raw write-only mode)` instead of `(evdev)`, the fallback is active and no root/udev
> changes are required.

---

## 3. Running the Receiver

### Graphical Mode (with Pairing Window & QR Code)

```bash
python3 main.py
```
This opens the desktop window showing:
- High-contrast QR code for camera scanning from your phone.
- Active IP address and listening port.
- Connected phone status and pointer speed sliders.

### Headless / Terminal Mode (for SSH or background)

```bash
python3 main.py --cli
```
This prints an ASCII QR code directly into your terminal—ideal for SSH sessions, Raspberry Pi, or media PCs.

### Custom Port

```bash
python3 main.py --port 9000
```

---

## 4. Systemd Autostart Service

To have Kursor start automatically when you log into your Linux desktop:

```bash
mkdir -p ~/.config/systemd/user
cp server/kursor.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now kursor
```

Check service status:
```bash
systemctl --user status kursor
```

View live logs:
```bash
journalctl --user -u kursor -f
```

---

## 5. Wayland vs X11 Compatibility

| Feature | Wayland (GNOME / KDE / Sway / Hyprland) | X11 |
|---|---|---|
| Cursor movement | Supported via `/dev/uinput` | Supported via `/dev/uinput` & `pynput` |
| Multi-touch scrolling | Supported | Supported |
| Real-time live keyboard | Supported | Supported |
| Presentation keys (F5, Esc, PageDown) | Supported | Supported |
| Desktop gestures (Overview, Show Desktop) | Supported (Super, Super+D) | Supported |
| Volume & Media keys | Supported (`pactl` & `playerctl`) | Supported (`pactl` & `playerctl`) |
| Lock screen control | Supported (`loginctl lock-session`) | Supported (`LockWorkStation`) |
| Sleep / suspend | Supported (`systemctl suspend`) | Supported (`SetSuspendState`) |
| PC clipboard viewer | Supported (`wl-paste` / `xclip` / `xsel`) | Supported (PowerShell) |
| Voice dictation | Phone Web Speech API -> PC typing | Phone Web Speech API -> PC typing |
| Screenshot & zoom keys | Win+Shift+S, PrtSc, Ctrl +/-/0 | Win+Shift+S, PrtSc, Ctrl +/-/0 |
