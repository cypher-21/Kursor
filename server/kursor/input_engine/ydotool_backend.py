import subprocess
import shutil
import time
from .base import InputBackend

class YdotoolBackend(InputBackend):
    """
    Wayland input fallback using `ydotool` CLI daemon.
    Works on Wayland compositors (GNOME, Sway, Hyprland) when ydotoold is running.
    """

    def __init__(self):
        if not shutil.which("ydotool"):
            raise RuntimeError("ydotool binary not found in PATH")
        self.remainder_x = 0.0
        self.remainder_y = 0.0
        self.remainder_scroll_y = 0.0
        print("[YdotoolBackend] Initialized ydotool backend")

    def move(self, dx: float, dy: float) -> None:
        self.remainder_x += dx
        self.remainder_y += dy
        ix = int(self.remainder_x)
        iy = int(self.remainder_y)
        if ix != 0 or iy != 0:
            self.remainder_x -= ix
            self.remainder_y -= iy
            subprocess.run(["ydotool", "mousemove", "-x", str(ix), "-y", str(iy)], capture_output=True)

    def click(self, button: str = "left", state: str = "click") -> None:
        btn_code = "0xC0"  # Left
        if button == "right":
            btn_code = "0xC1"
        elif button == "middle":
            btn_code = "0xC2"

        if state == "down":
            subprocess.run(["ydotool", "click", f"{btn_code}:1"], capture_output=True)
        elif state == "up":
            subprocess.run(["ydotool", "click", f"{btn_code}:0"], capture_output=True)
        else:
            subprocess.run(["ydotool", "click", btn_code], capture_output=True)

    def scroll(self, dx: float, dy: float) -> None:
        self.remainder_scroll_y += dy
        steps_y = int(self.remainder_scroll_y)
        if steps_y != 0:
            self.remainder_scroll_y -= steps_y
            subprocess.run(["ydotool", "mousemove", "-w", str(steps_y)], capture_output=True)

    def press_key(self, key_name: str) -> None:
        key_codes = {
            "page_down": "109:1 109:0",
            "pagedown": "109:1 109:0",
            "page_up": "104:1 104:0",
            "pageup": "104:1 104:0",
            "f5": "63:1 63:0",
            "escape": "1:1 1:0",
            "esc": "1:1 1:0",
            "b": "48:1 48:0",
            "w": "17:1 17:0",
            "left": "105:1 105:0",
            "right": "106:1 106:0",
            "enter": "28:1 28:0",
            "backspace": "14:1 14:0",
        }
        cmd = key_codes.get(key_name.lower())
        if cmd:
            subprocess.run(["ydotool", "key"] + cmd.split(), capture_output=True)

    def type_text(self, text: str) -> None:
        subprocess.run(["ydotool", "type", text], capture_output=True)

    def gesture(self, action: str) -> None:
        if action == "overview":
            subprocess.run(["ydotool", "key", "125:1", "125:0"], capture_output=True)  # Super
        elif action == "desktop":
            subprocess.run(["ydotool", "key", "125:1", "32:1", "32:0", "125:0"], capture_output=True)  # Super+D
