import sys
import shutil
import subprocess
from pathlib import Path
from typing import Dict, Any

try:
    from pynput.keyboard import Controller as KeyboardController, Key
    _HAS_PYNPUT = True
except ImportError:
    _HAS_PYNPUT = False

class SystemControls:
    """Manages host system settings (Audio, Media playback, DND, Battery) on Linux & Windows."""

    def __init__(self):
        self.is_windows = sys.platform == "win32"
        self.has_pactl = shutil.which("pactl") is not None
        self.has_pamixer = shutil.which("pamixer") is not None
        self.has_playerctl = shutil.which("playerctl") is not None
        self.has_dunstctl = shutil.which("dunstctl") is not None
        self.dnd_active = False
        self._kb = KeyboardController() if _HAS_PYNPUT else None

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
        elif self.has_playerctl:
            subprocess.run(["playerctl", "play-pause"], capture_output=True)

    def media_next(self) -> None:
        if self.is_windows and self._kb:
            self._kb.press(Key.media_next)
            self._kb.release(Key.media_next)
        elif self.has_playerctl:
            subprocess.run(["playerctl", "next"], capture_output=True)

    def media_prev(self) -> None:
        if self.is_windows and self._kb:
            self._kb.press(Key.media_previous)
            self._kb.release(Key.media_previous)
        elif self.has_playerctl:
            subprocess.run(["playerctl", "previous"], capture_output=True)

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
