# Kursor Communication Protocol Specification

This document details the network protocol between the Android remote client and the desktop host receiver (Windows & Linux).

---

## 1. LAN Auto-Discovery Protocol (UDP Port 8766)

To eliminate manual IP configuration, Kursor runs a lightweight UDP discovery beacon.

### A. Host Beacon (Broadcast)
The server periodically broadcasts a UDP packet to `255.255.255.255:8766` every 2.5 seconds:

```json
{
  "service": "kursor",
  "name": "Kursor (Windows)",
  "hostname": "desktop-pc",
  "ips": ["192.168.1.140"],
  "port": 8765,
  "os": "win32",
  "version": "1.0.0"
}
```

### B. Client Discovery Probe (Unicast Query)
The Android client can send a query packet broadcast on port 8766:

```json
{
  "query": "kursor_discover"
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
  "server_name": "Kursor (Windows)",
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
The server applies non-linear acceleration curves (`factor = 1.0 + (distance * 0.05 * (accel - 1.0)) * sens`) and injects relative motion via native Win32 API (`mouse_event`) or Linux kernel `/dev/uinput` (`REL_X`, `REL_Y`).

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

### E. Real-Time Live Keyboard (Client -> Server)
Allows direct real-time typing from Android keyboards without requiring a separate "Submit" button:

- **Live Character**:
  ```json
  {
    "type": "live_input",
    "char": "a"
  }
  ```
- **Live Backspace**:
  ```json
  {
    "type": "live_backspace"
  }
  ```
- **Live Enter**:
  ```json
  {
    "type": "live_enter"
  }
  ```

### F. Key Press & Modifiers (Client -> Server)
```json
{
  "type": "key",
  "key": "escape"
}
```
Supported keys include: `escape`, `tab`, `enter`, `backspace`, `space`, `super` / `win`, `ctrl`, `alt`, `delete`, `up`, `down`, `left`, `right`, `ctrl_c`, `ctrl_v`, `ctrl_z`, `ctrl_a`, `ctrl_w`, `alt_f4`.

### G. Desktop Gestures (Client -> Server)
```json
{
  "type": "gesture",
  "action": "overview"
}
```
Actions:
- `"overview"`: Task View / Overview (Win+Tab on Windows, Super on Linux)
- `"desktop"`: Show Desktop (Win+D / Super+D)
- `"workspace_next"`: Switch virtual desktop right
- `"workspace_prev"`: Switch virtual desktop left

### H. Presenter Controls (Client -> Server)
```json
{
  "type": "presenter",
  "action": "next"
}
```
Actions:
- `"next"`: Advance slide (PageDown)
- `"prev"`: Previous slide (PageUp)
- `"start"`: Start slideshow (F5)
- `"exit"`: Exit slideshow (Esc)
- `"black"`: Blank black screen (B)
- `"white"`: White screen (W)

### I. Presenter Quick Keys (Client -> Server)
```json
{ "type": "presenter", "action": "start" }
```
- `action`: `"start"` (F5), `"exit"` (Esc), `"next"` (PageDown), `"prev"` (PageUp)
- NOTE: the legacy `"laser"` message (on-screen laser dot / spotlight overlay)
  was removed; the server now simply ignores it, unknown message types follow
  the standard unknown-type warning path.

### J. Media & System Controls (Client -> Server)
```json
{
  "type": "media",
  "action": "vol_up"
}
```
Actions:
- `"vol_up"`, `"vol_down"`: Adjust system volume
- `"mute"`: Toggle mute
- `"set_vol"`: Set specific volume (`value: 0-100`)
- `"play_pause"`, `"next"`, `"prev"`: Control media player

After every state-changing action, the server reads fresh system state and
broadcasts it to **all** connected clients as a `status` message (see section O),
so every phone UI stays in sync.

### K. Silence Notifications / DND (Client -> Server)
```json
{
  "type": "dnd"
}
```
The server replies with a `dnd_state` message and broadcasts the full `status`.

### K1. PIN Pairing Authenticate (Client -> Server)

If `pin_required: true` and `pin: "<code>"` are set in `~/.config/kursor/config.json`,
the server rejects all input commands until the client authenticates:

```json
{
  "type": "auth",
  "pin": "1234"
}
```
Responses (Server -> Client):
- `{"type": "auth_ok", "server_name": ..., "status": ..., "settings": ...}` — input unlocked
- `{"type": "auth_error", "attempts_remaining": 3}` — wrong PIN (max 5 attempts)
- `{"type": "auth_denied", "message": "Too many failed attempts."}` — connection is closed
- `{"type": "auth_required"}` — sent when a non-auth command arrives before authenticating

While locked, only `auth` and `ping` messages are processed. The `init`
message includes `"auth_required": true/false` so clients can prompt for a
PIN immediately; the full system `status` is only sent after successful
authentication (unless auth is disabled). A remembered PIN can be resent
automatically by the web remote (stored in `localStorage.kursor_pin`).

### L. Bulk Text Transmission (Client -> Server)
```json
{
  "type": "text",
  "content": "https://github.com"
}
```

### M. Latency Ping-Pong (Bidirectional)
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
Client calculates round-trip time (`Date.now() - data.t`) to display real-time connection latency.

### N. System State Push (Server -> Client)
Sent after every `media` / `dnd` action (to all clients) so UIs stay in sync:
```json
{
  "type": "status",
  "status": {
    "volume": 75,
    "muted": false,
    "dnd": false,
    "playing": null,
    "battery": 100,
    "charging": false
  }
}
```
Notes:
- `volume` / `muted`: read live from the audio server (`pamixer`, or `pactl` fallback) on Linux; the Win32 mixer on Windows
- `playing`: `true` / `false` when the host can detect playback state (Linux `playerctl`), otherwise `null`
- `dnd`: real notification state read back from the system (`dunstctl` / GNOME `gsettings`), not just the last toggle
- `battery` / `charging`: from `/sys/class/power_supply` (Linux) or `GetSystemPowerStatus` (Windows)
