import sys
import ctypes
import shutil
import subprocess
from pathlib import Path
from typing import Dict, Any, Optional

try:
    from pynput.keyboard import Controller as KeyboardController, Key
    _HAS_PYNPUT = True
except ImportError:
    _HAS_PYNPUT = False

class SystemControls:
    """Manages host system settings (Audio, Media playback, DND, Battery) on Linux & Windows."""

    def __init__(self, input_backend=None):
        self.is_windows = sys.platform == "win32"
        self.has_pactl = shutil.which("pactl") is not None
        self.has_pamixer = shutil.which("pamixer") is not None
        self.has_playerctl = shutil.which("playerctl") is not None
        self.has_dunstctl = shutil.which("dunstctl") is not None
        self.dnd_active = False
        self._kb = KeyboardController() if _HAS_PYNPUT else None
        # Optional: the same virtual input device used for cursor/keys. When
        # playerctl is unavailable (or fails), media commands are injected as
        # real hardware media keys (KEY_PLAYPAUSE etc.) which GNOME/KDE/Windows
        # forward to the active player - no external dependency needed.
        self._input_backend = input_backend

    def _media_key(self, key: str) -> None:
        """Last-resort media control via the virtual input device."""
        be = self._input_backend
        if be is None:
            print(f"[SystemControls] No media route available for '{key}' "
                  "(install playerctl for precise per-app control)")
            return
        try:
            be.press_key(key)
        except Exception as exc:
            print(f"[SystemControls] Media-key fallback failed for '{key}': {exc}")

    def volume_up(self, step: int = 5) -> None:
        if self.is_windows and self._kb:
            self._kb.press(Key.media_volume_up)
            self._kb.release(Key.media_volume_up)
        elif self.has_pactl:
            subprocess.run(["pactl", "set-sink-volume", "@DEFAULT_SINK@", f"+{step}%"], capture_output=True)
        elif self.has_pamixer:
            subprocess.run(["pamixer", "-i", str(step)], capture_output=True)
        else:
            subprocess.run(["amixer", "-D", "pulse", "sset", "Master", f"{step}%+"], capture_output=True)

    def volume_down(self, step: int = 5) -> None:
        if self.is_windows and self._kb:
            self._kb.press(Key.media_volume_down)
            self._kb.release(Key.media_volume_down)
        elif self.has_pactl:
            subprocess.run(["pactl", "set-sink-volume", "@DEFAULT_SINK@", f"-{step}%"], capture_output=True)
        elif self.has_pamixer:
            subprocess.run(["pamixer", "-d", str(step)], capture_output=True)
        else:
            subprocess.run(["amixer", "-D", "pulse", "sset", "Master", f"{step}%-"], capture_output=True)

    def volume_mute_toggle(self) -> None:
        if self.is_windows and self._kb:
            self._kb.press(Key.media_volume_mute)
            self._kb.release(Key.media_volume_mute)
        elif self.has_pactl:
            subprocess.run(["pactl", "set-sink-mute", "@DEFAULT_SINK@", "toggle"], capture_output=True)
        elif self.has_pamixer:
            subprocess.run(["pamixer", "-t"], capture_output=True)

    def set_volume(self, percent: int) -> None:
        percent = max(0, min(100, percent))
        if self.has_pactl:
            subprocess.run(["pactl", "set-sink-volume", "@DEFAULT_SINK@", f"{percent}%"], capture_output=True)
        elif self.has_pamixer:
            subprocess.run(["pamixer", "--set-volume", str(percent)], capture_output=True)

    def media_play_pause(self) -> None:
        if self.is_windows and self._kb:
            self._kb.press(Key.media_play_pause)
            self._kb.release(Key.media_play_pause)
        elif self.has_playerctl and self._playerctl_ok("play-pause"):
            pass  # succeeded; per-player MPRIS control
        else:
            self._media_key("play_pause")

    def media_next(self) -> None:
        if self.is_windows and self._kb:
            self._kb.press(Key.media_next)
            self._kb.release(Key.media_next)
        elif self.has_playerctl and self._playerctl_ok("next"):
            pass
        else:
            self._media_key("next_track")

    def media_prev(self) -> None:
        if self.is_windows and self._kb:
            self._kb.press(Key.media_previous)
            self._kb.release(Key.media_previous)
        elif self.has_playerctl and self._playerctl_ok("previous"):
            pass
        else:
            self._media_key("prev_track")

    def _playerctl_ok(self, command: str) -> bool:
        """Run a playerctl command; return True only if it actually succeeded."""
        try:
            res = subprocess.run(
                ["playerctl", "-a", command], capture_output=True, text=True, timeout=3
            )
            if res.returncode == 0:
                return True
            err = (res.stderr or res.stdout).strip()
            if err:
                print(f"[SystemControls] playerctl {command} failed: {err}")
        except Exception as exc:
            print(f"[SystemControls] playerctl {command} error: {exc}")
        return False

    # ------------------------------------------------------------------ #
    # Power actions
    # ------------------------------------------------------------------ #

    def lock_screen(self) -> None:
        if self.is_windows:
            try:
                ctypes.windll.user32.LockWorkStation()
            except Exception as exc:
                print(f"[SystemControls] LockWorkStation failed: {exc}")
        elif shutil.which("loginctl"):
            # Works on GNOME/KDE Wayland & X11 (logind session lock)
            subprocess.run(["loginctl", "lock-session"], capture_output=True, timeout=5)
        else:
            # GNOME fallback via D-Bus
            subprocess.run(
                ["gdbus", "call", "--session",
                 "--dest", "org.gnome.ScreenSaver",
                 "--object-path", "/org/gnome/ScreenSaver",
                 "--method", "org.gnome.ScreenSaver.Lock"],
                capture_output=True, timeout=5,
            )

    def sleep(self) -> None:
        """Put the machine to sleep (S3 suspend)."""
        if self.is_windows:
            subprocess.run(
                ["rundll32.exe", "powrprof.dll,SetSuspendState", "0", "1", "0"],
                capture_output=True, timeout=5,
            )
        else:
            # polkit typically allows suspend for the active desktop session
            subprocess.run(["systemctl", "suspend"], capture_output=True, timeout=5)

    # ------------------------------------------------------------------ #
    # Clipboard
    # ------------------------------------------------------------------ #

    def get_clipboard_text(self) -> Optional[str]:
        """Read plain text from the PC clipboard (Wayland-first on Linux)."""
        if self.is_windows:
            try:
                res = subprocess.run(
                    ["powershell", "-NoProfile", "-Command",
                     "Get-Clipboard -TextFormatType Text"],
                    capture_output=True, text=True, timeout=4,
                )
                if res.returncode == 0:
                    return res.stdout.rstrip("\r\n") or None
            except Exception:
                pass
            return None

        # Wayland (GNOME/KDE/Sway): wl-paste reads the real Wayland clipboard
        if shutil.which("wl-paste"):
            try:
                res = subprocess.run(
                    ["wl-paste", "--no-newline", "--type", "text/plain;charset=utf-8"],
                    capture_output=True, text=True, timeout=3,
                )
                if res.returncode == 0:
                    return res.stdout or None
            except Exception:
                pass

        # X11 path (also works under Xwayland sessions) - see the probe lesson:
        # xclip can daemonize & hang, so always run with a timeout.
        for cmd in (["xclip", "-selection", "clipboard", "-o"],
                    ["xsel", "--clipboard", "--output"]):
            if shutil.which(cmd[0]):
                try:
                    res = subprocess.run(cmd, capture_output=True, text=True, timeout=3)
                    if res.returncode == 0:
                        return res.stdout or None
                except Exception:
                    pass
        return None

    def toggle_dnd(self) -> bool:
        """Toggle Do Not Disturb (silence notifications)."""
        self.dnd_active = not self.dnd_active
        if self.has_dunstctl:
            subprocess.run(["dunstctl", "set-paused", "true" if self.dnd_active else "false"], capture_output=True)
        else:
            # Try GNOME Shell notification setting via gsettings
            try:
                subprocess.run([
                    "gsettings", "set", "org.gnome.desktop.notifications",
                    "show-banners", "false" if self.dnd_active else "true"
                ], capture_output=True)
            except Exception:
                pass
        return self.dnd_active

    def get_system_status(self) -> Dict[str, Any]:
        """Fetch battery, volume, and host information."""
        vol = 50
        is_muted = False

        if self.has_pamixer:
            try:
                res = subprocess.run(["pamixer", "--get-volume"], capture_output=True, text=True)
                vol = int(res.stdout.strip())
                res_m = subprocess.run(["pamixer", "--get-mute"], capture_output=True, text=True)
                is_muted = res_m.stdout.strip() == "true"
            except Exception:
                pass
        elif self.has_pactl:
            # Parse "Volume: front-left: 49152 /  75% / -7.50 dB, ..."
            try:
                res = subprocess.run(
                    ["pactl", "get-sink-volume", "@DEFAULT_SINK@"], capture_output=True, text=True
                )
                for token in res.stdout.split():
                    if token.endswith("%"):
                        vol = int(token[:-1])
                        break
                res_m = subprocess.run(
                    ["pactl", "get-sink-mute", "@DEFAULT_SINK@"], capture_output=True, text=True
                )
                is_muted = res_m.stdout.strip().lower() == "mute: yes"
            except Exception:
                pass

        # Reflect the real DND state instead of only tracking it locally
        dnd_active = self.dnd_active
        if self.has_dunstctl:
            try:
                res = subprocess.run(["dunstctl", "get-paused"], capture_output=True, text=True)
                dnd_active = res.stdout.strip().lower() == "true"
                self.dnd_active = dnd_active
            except Exception:
                pass
        elif sys.platform != "win32" and shutil.which("gsettings") is not None:
            try:
                res = subprocess.run(
                    ["gsettings", "get", "org.gnome.desktop.notifications", "show-banners"],
                    capture_output=True, text=True
                )
                # show-banners false == notifications silenced == DND on
                dnd_active = res.stdout.strip().lower() == "false"
                self.dnd_active = dnd_active
            except Exception:
                pass

        # Check laptop battery (Linux & Windows)
        battery_pct = None
        is_charging = False
        if self.is_windows:
            try:
                import ctypes
                from ctypes import wintypes
                class _SPS(ctypes.Structure):
                    _fields_ = [
                        ("ACLineStatus", wintypes.BYTE),
                        ("BatteryFlag", wintypes.BYTE),
                        ("BatteryLifePercent", wintypes.BYTE),
                        ("SystemStatusFlag", wintypes.BYTE),
                        ("BatteryLifeTime", wintypes.DWORD),
                        ("BatteryFullLifeTime", wintypes.DWORD),
                    ]
                sps = _SPS()
                if ctypes.windll.kernel32.GetSystemPowerStatus(ctypes.byref(sps)):
                    if sps.BatteryLifePercent != 255:
                        battery_pct = int(sps.BatteryLifePercent)
                    is_charging = sps.ACLineStatus == 1
            except Exception:
                pass
        else:
            bat_dirs = list(Path("/sys/class/power_supply").glob("BAT*")) if Path("/sys/class/power_supply").exists() else []
            if bat_dirs:
                try:
                    cap_file = bat_dirs[0] / "capacity"
                    if cap_file.exists():
                        battery_pct = int(cap_file.read_text().strip())
                    stat_file = bat_dirs[0] / "status"
                    if stat_file.exists():
                        is_charging = stat_file.read_text().strip().lower() == "charging"
                except Exception:
                    pass

        # Actual playback state, when the desktop exposes it
        playing = None
        if self.has_playerctl and sys.platform != "win32":
            try:
                res = subprocess.run(["playerctl", "-a", "status"], capture_output=True, text=True)
                first = res.stdout.strip().splitlines()
                if first:
                    playing = first[0].strip().lower() == "playing"
            except Exception:
                pass

        return {
            "volume": vol,
            "muted": is_muted,
            "dnd": dnd_active,
            "playing": playing,
            "battery": battery_pct,
            "charging": is_charging
        }
