import shutil
import subprocess
from pathlib import Path
from typing import Dict, Any

class SystemControls:
    """Manages Linux host system settings (Audio, Media playback, DND, Battery)."""

    def __init__(self):
        self.has_pactl = shutil.which("pactl") is not None
        self.has_pamixer = shutil.which("pamixer") is not None
        self.has_playerctl = shutil.which("playerctl") is not None
        self.has_dunstctl = shutil.which("dunstctl") is not None
        self.dnd_active = False

    def volume_up(self, step: int = 5) -> None:
        if self.has_pactl:
            subprocess.run(["pactl", "set-sink-volume", "@DEFAULT_SINK@", f"+{step}%"], capture_output=True)
        elif self.has_pamixer:
            subprocess.run(["pamixer", "-i", str(step)], capture_output=True)
        else:
            subprocess.run(["amixer", "-D", "pulse", "sset", "Master", f"{step}%+"], capture_output=True)

    def volume_down(self, step: int = 5) -> None:
        if self.has_pactl:
            subprocess.run(["pactl", "set-sink-volume", "@DEFAULT_SINK@", f"-{step}%"], capture_output=True)
        elif self.has_pamixer:
            subprocess.run(["pamixer", "-d", str(step)], capture_output=True)
        else:
            subprocess.run(["amixer", "-D", "pulse", "sset", "Master", f"{step}%-"], capture_output=True)

    def volume_mute_toggle(self) -> None:
        if self.has_pactl:
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
        if self.has_playerctl:
            subprocess.run(["playerctl", "play-pause"], capture_output=True)

    def media_next(self) -> None:
        if self.has_playerctl:
            subprocess.run(["playerctl", "next"], capture_output=True)

    def media_prev(self) -> None:
        if self.has_playerctl:
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

        # Check laptop battery
        battery_pct = None
        is_charging = False
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

        return {
            "volume": vol,
            "muted": is_muted,
            "dnd": self.dnd_active,
            "battery": battery_pct,
            "charging": is_charging
        }
