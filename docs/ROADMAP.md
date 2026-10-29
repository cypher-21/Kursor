# Kursor — Improvement Roadmap

Ideas and fixes identified during the v1.0 review, ordered by impact.
Items marked ✅ are done in this codebase; others are proposed next steps.

## 0. Recently fixed (session summary)

- ✅ Linux uinput: write-only fallback driver (`raw_uinput.py`) → works on Wayland
  with udev `MODE="0220"` (no root needed). Loud warnings instead of silent
  pynput failure; `evdev` now actually installed via `requirements.txt`.
- ✅ Phone UI stuck at 50% volume: server now reads the real volume
  (`pamixer` → `pactl` fallback) and **broadcasts a `status` push** to every
  client after media/DND changes. Real DND state read back from
  `dunstctl`/GNOME `gsettings`. Play/pause UI follows real playback state
  where detectable (Linux `playerctl`).
- ✅ `start-linux.sh` no longer installs pip packages on every launch (fast
  import check instead). `npm run build:desktop` builds **and syncs** the
  committed web assets (`android/scripts/sync-static.mjs`).

## 1. Security (highest impact, pick first)

| Item | Detail |
|---|---|
| ✅ Enforce the PIN handshake | `server.py` now requires `{type:"auth", pin}` as the first command when `pin_required` is set; wrong PINs are rate-limited (5 tries → connection closed). The web remote prompts via a mandatory `PinModal` and remembers a working PIN. |
| Show pairing secret in QR | Append a short token to the pairing URL (`http://ip:port/?k=<token>`) and require it on connect. QR auto-pairing stays one click, LAN strangers stay out. (Next step after the PIN flow.) |
| One-client pairing mode | Keep `connected_sockets` capped (e.g. 1–2 peers) and drop idle connections after N minutes without `ping`. |
| Bind option | Add `bind_ip` to config (default `0.0.0.0`, allow `127.0.0.1` for testing). |

## 2. Receiver & protocol robustness

- **Periodic state sync**: re-broadcast `status` every ~10 s (or after a client
  reconnects) so volume changes made directly on the PC are never missed.
- **Windows playback detection**: `playing` is Linux-only today. Optionally use
  `GlobalSystemMediaTransportControlsSessionManager` (WinRT) via `pywinrt`/
  `winsdk`, or leave as documented `null` on Windows.
- **Auth ack + protocol version** in `init`: `{version: "1.1", auth_required: bool}`
  so old clients can't half-work with a new server. (✅ `auth_required` shipped;
  bumping the numeric `protocol` field as clients migrate is the follow-up.)
- **Input-event batching**: `move` messages arrive at very high frequency; a
  small server-side batch (per 10–15 ms) smooths workloads under load.
- **✅ Reconnect strategy in the web remote**: `useSocket` now auto-reconnects
  with exponential back-off (1s → 2s → 4s → 8s → 10s cap), shows a
  “Retry…” badge in the header, and no longer uses a stale `host` closure.

## 3. Launchers / packaging ("one script per platform")

- **Single source of truth**: make `main.py` the only entry (`--gui/--cli`),
  and shrink `start-linux.sh` / `start-windows.bat` into thin wrappers.
  Deprecate `start-cli.bat` (Windows CLI is already `start-windows.bat --cli`).
- **Windows**: prefer the `py -3` launcher when `python` is not on PATH, set
  console code page to UTF-8 (`chcp 65001`) so the ASCII QR renders correctly.
- **Desktop integration**: install a GNOME/KDE autostart `.desktop` (Linux) and
  a Startup-folder shortcut (Windows) from `install.sh` / the .bat installer.
- **Ship binaries**: PyInstaller one-file exe (Windows) and `python -m pip`
  packaging or an AppImage (Linux) so non-technical users don't need Python.
- systemd unit: `kursor.service` should include
  `Restart=on-failure`, `WantedBy=graphical-session.target`, and run in the
  login session (needs DISPLAY/WAYLAND env) — document that.

## 4. Web remote UX

- **Auto-connect via QR deep link**: embed `?ip=<host>&port=<port>`; the remote
  connects instantly without scanning a manual host entry.
- **Fix initial host fallback**: `getInitialHost` falls back to `192.168.1.100`
  (nonsense on most LANs); prefer `location.hostname`, then saved, then show
  the manual connect modal.
- **Driver hint card**: when connected and latency is fine but the server
  reports `driver: mock`, show a warning banner on the phone ("Receiver has no
  cursor driver — run setup-uinput.sh").
- Scroll feel: keep the sub-notch accumulation; consider exposing the wheel
  notch size as a setting for Linux trackpads.
- Presentation timer: persist across re-renders/remounts (currently resets).

## 5. Engineering quality

- Use Python `logging` with timestamps/levels instead of `print` across the
  server; write to stderr in `--cli`, to `$XDG_STATE_HOME/kursor/log` otherwise.
## 6. Session-4 audit sweep (new findings)

Fixed now:
- ✅ **PWA cache staleness**: `sw.js` was cache-first for *everything* (except /ws,
  /api), so installed phones kept the OLD UI forever. Now: network-first for
  navigations, cache-first for immutable hashed `/assets/*`, cache name bumped
  to `kursor-v3`.
- ✅ Version stamping: single `kursor/__version__ = "1.1.0"` used by `/api/info`
  and the UDP beacon (was hardcoded `1.0.0` in three places).
- ✅ `start-windows.bat` silently dropped arguments (`--port 9000` never reached
  `main.py`). All args are now forwarded (`python main.py %*`).
- ✅ GUI sliders wrote `config.json` on **every tick** while dragging → debounced
  500 ms save.
- ✅ Removed unused `websockets` dependency (aiohttp provides the WS server).

Still open (next candidates):
1. ~~Laser overlay click-through on Linux~~ — OBSOLETE: the laser/spotlight
   overlay feature was removed entirely (Session 6); the presenter pad now
   always moves the cursor plus quick keys (F5 / B / W / Esc).
2. Discovery beacon only to `255.255.255.255` (blocked by many routers/ISPs);
   add subnet-directed broadcast (e.g. `192.168.1.255` from the interface netmask).
3. Trackpad `touchmove` handler sends one WS message per event (~120 Hz on
   modern phones) — requestAnimationFrame batching would smooth input & save
   battery.
4. "127.0.1.1" shows up in the `Host IP list` (Debian hostname quirk) — filter
   it out of QR candidates.
5. Battery/charging in status currently only updates on pushes — reuse the
   10s periodic `status` re-broadcast idea from section 2.
6. CI + tests (pytest for os/server methods, `npm ci` + build in Actions) and
   packaging (PyInstaller exe / PyPI / AppImage).
7. GUI has no PIN toggle yet — add "Pairing" section in `KursorGUI`.
8. Rename the `android/` folder (it's actually the shared web remote, not an
   Android app) to e.g. `remote/` with a compat note in README.
- Pin frontend deps (`package-lock.json` is committed — keep it, add
  `npm ci` in CI) and publish the bundle version into `/api/info`.
