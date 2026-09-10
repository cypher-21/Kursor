# Mousely Communication Protocol Specification

This document details the network protocol between the Android remote client and the Linux host receiver.

---

## 1. LAN Auto-Discovery Protocol (UDP Port 8766)

To eliminate manual IP configuration, Mousely runs a lightweight UDP discovery beacon.

### A. Host Beacon (Broadcast)
The Linux server periodically broadcasts a UDP packet to `255.255.255.255:8766` every 2.5 seconds:

```json
{
  "service": "mousely",
  "name": "Mousely Linux",
  "hostname": "arch-desktop",
  "ips": ["192.168.1.140"],
  "port": 8765,
  "os": "linux",
  "version": "1.0.0"
}
```

### B. Client Discovery Probe (Unicast Query)
The Android client can send a query packet to broadcast on port 8766:

```json
{
  "query": "mousely_discover"
}
```
The server responds immediately with its server details.

---

## 2. Real-Time Command Protocol (WebSocket `/ws`)

The Android remote connects to `ws://<host-ip>:8765/ws`.

### A. Initialization Handshake (Server -> Client)
Sent immediately upon connection:

```json
{
  "type": "init",
  "server_name": "Mousely Linux",
  "status": {
    "volume": 70,
    "muted": false,
    "dnd": false,
    "battery": 88,
    "charging": true
  },
  "settings": {
    "sensitivity": 1.2,
    "invert_scroll": false
  }
}
```

### B. Trackpad Motion (Client -> Server)
Sent at 60Hz-120Hz during finger movement:

```json
{
  "type": "move",
  "dx": 2.4,
  "dy": -1.8
}
```
- The server applies non-linear acceleration curves (`factor = 1.0 + (distance * 0.05 * (accel - 1.0)) * sens`) and injects relative motion via `/dev/uinput` (`REL_X`, `REL_Y`).

### C. Mouse Clicks (Client -> Server)
```json
{
  "type": "click",
  "button": "left",
  "state": "click"
}
```
- `button`: `"left"`, `"right"`, or `"middle"`
- `state`: `"click"` (tap), `"down"` (press), or `"up"` (release)

### D. Scrolling (Client -> Server)
```json
{
  "type": "scroll",
  "dx": 0.0,
  "dy": 4.5
}
```
- Injects `REL_WHEEL` (vertical) and `REL_HWHEEL` (horizontal) into `/dev/uinput`.

### E. Desktop Gestures (Client -> Server)
```json
{
  "type": "gesture",
  "action": "overview"
}
```
Actions:
- `"overview"`: Super / Meta key (opens GNOME Shell / KDE Plasma / Sway application overview)
- `"desktop"`: Super + D (shows desktop)
- `"workspace_next"`: Switch to next virtual workspace (Ctrl + Alt + Right)
- `"workspace_prev"`: Switch to previous virtual workspace (Ctrl + Alt + Left)

### F. Presenter Controls (Client -> Server)
```json
{
  "type": "presenter",
  "action": "next"
}
```
Actions:
- `"next"`: Advance slide (`KEY_PAGEDOWN`)
- `"prev"`: Previous slide (`KEY_PAGEUP`)
- `"start"`: Start slideshow (`KEY_F5`)
- `"exit"`: Exit slideshow (`KEY_ESC`)
- `"black"`: Blank black screen (`KEY_B`)
- `"white"`: White screen (`KEY_W`)

### G. Digital Laser Pointer & Spotlight (Client -> Server)
```json
{
  "type": "laser",
  "active": true,
  "x": 960,
  "y": 540,
  "mode": "laser"
}
```
- `mode`: `"laser"` (glowing red dot with particle halo) or `"spotlight"` (presentation spotlight circle)
- `x`, `y`: Screen coordinate targets

### H. Media & System Controls (Client -> Server)
```json
{
  "type": "media",
  "action": "vol_up"
}
```
Actions:
- `"vol_up"`, `"vol_down"`: Adjust system volume via `pactl`
- `"mute"`: Toggle mute
- `"set_vol"`: Set specific volume (`value: 0-100`)
- `"play_pause"`, `"next"`, `"prev"`: Control active media player via `playerctl` / MPRIS

### I. Silence Notifications / DND (Client -> Server)
```json
{
  "type": "dnd"
}
```

### J. Virtual Keyboard & Keystrokes (Client -> Server)
```json
{
  "type": "text",
  "content": "Hello World"
}
```
Or individual keys:
```json
{
  "type": "key",
  "key": "enter"
}
```

### K. Latency Ping-Pong (Bidirectional)
Client sends:
```json
{
  "type": "ping",
  "t": 1726000000000
}
```
Server replies:
```json
{
  "type": "pong",
  "t": 1726000000000
}
```
Client calculates one-way or round-trip time (`Date.now() - data.t`) to display real-time latency (e.g. `2ms`).
