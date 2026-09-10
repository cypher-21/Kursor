import time
from .base import InputBackend

try:
    from pynput.mouse import Controller as MouseController, Button
    from pynput.keyboard import Controller as KeyboardController, Key
    HAVE_PYNPUT = True
except ImportError:
    HAVE_PYNPUT = False

class X11Backend(InputBackend):
    """
    Input backend utilizing pynput for X11 Linux desktop environments
    and cross-platform development/fallback.
    """

    def __init__(self):
        if not HAVE_PYNPUT:
            raise RuntimeError("pynput is not installed. Install via: pip install pynput")
        self.mouse = MouseController()
        self.keyboard = KeyboardController()
        print("[X11Backend] Initialized X11 / pynput input backend")

    def move(self, dx: float, dy: float) -> None:
        self.mouse.move(int(dx), int(dy))

    def click(self, button: str = "left", state: str = "click") -> None:
        btn = Button.left
        if button == "right":
            btn = Button.right
        elif button == "middle":
            btn = Button.middle

        if state == "down":
            self.mouse.press(btn)
        elif state == "up":
            self.mouse.release(btn)
        else:
            self.mouse.click(btn, 1)

    def scroll(self, dx: float, dy: float) -> None:
        # pynput scroll(dx, dy)
        self.mouse.scroll(int(dx), int(dy))

    def press_key(self, key_name: str) -> None:
        norm = key_name.lower().strip()
        key_map = {
            "page_down": Key.page_down,
            "pagedown": Key.page_down,
            "page_up": Key.page_up,
            "pageup": Key.page_up,
            "f5": Key.f5,
            "escape": Key.esc,
            "esc": Key.esc,
            "left": Key.left,
            "right": Key.right,
            "up": Key.up,
            "down": Key.down,
            "enter": Key.enter,
            "backspace": Key.backspace,
            "tab": Key.tab,
            "space": Key.space,
            "super": Key.cmd,
            "b": 'b',
            "w": 'w',
            "volume_up": Key.media_volume_up,
            "volume_down": Key.media_volume_down,
            "mute": Key.media_volume_mute,
            "play_pause": Key.media_play_pause,
            "next_track": Key.media_next,
            "prev_track": Key.media_previous,
        }
        k = key_map.get(norm)
        if k:
            self.keyboard.press(k)
            time.sleep(0.01)
            self.keyboard.release(k)
        elif len(norm) == 1:
            self.keyboard.press(norm)
            time.sleep(0.01)
            self.keyboard.release(norm)

    def type_text(self, text: str) -> None:
        self.keyboard.type(text)

    def gesture(self, action: str) -> None:
        if action == "overview":
            self.keyboard.press(Key.cmd)
            time.sleep(0.02)
            self.keyboard.release(Key.cmd)
        elif action == "desktop":
            with self.keyboard.pressed(Key.cmd):
                self.keyboard.press('d')
                self.keyboard.release('d')
        elif action == "workspace_next":
            with self.keyboard.pressed(Key.ctrl), self.keyboard.pressed(Key.alt):
                self.keyboard.press(Key.right)
                self.keyboard.release(Key.right)
        elif action == "workspace_prev":
            with self.keyboard.pressed(Key.ctrl), self.keyboard.pressed(Key.alt):
                self.keyboard.press(Key.left)
                self.keyboard.release(Key.left)
