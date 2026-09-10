import sys
import time
from .base import InputBackend

try:
    from pynput.mouse import Controller as MouseController, Button
    from pynput.keyboard import Controller as KeyboardController, Key
    HAVE_PYNPUT = True
except ImportError:
    HAVE_PYNPUT = False

if sys.platform == "win32":
    import ctypes
    MOUSEEVENTF_MOVE = 0x0001
    MOUSEEVENTF_LEFTDOWN = 0x0002
    MOUSEEVENTF_LEFTUP = 0x0004
    MOUSEEVENTF_RIGHTDOWN = 0x0008
    MOUSEEVENTF_RIGHTUP = 0x0010
    MOUSEEVENTF_MIDDLEDOWN = 0x0020
    MOUSEEVENTF_MIDDLEUP = 0x0040
    MOUSEEVENTF_WHEEL = 0x0800
    MOUSEEVENTF_HWHEEL = 0x1000

class X11Backend(InputBackend):
    """
    Input backend utilizing native Win32 API on Windows,
    and pynput on X11 Linux.
    """

    def __init__(self):
        self.is_windows = sys.platform == "win32"
        if not HAVE_PYNPUT and not self.is_windows:
            raise RuntimeError("pynput is not installed. Install via: pip install pynput")
        self.mouse = MouseController() if HAVE_PYNPUT else None
        self.keyboard = KeyboardController() if HAVE_PYNPUT else None
        platform_name = "Windows Win32" if self.is_windows else "X11 / pynput"
        print(f"[InputBackend] Initialized {platform_name} input driver")

    def move(self, dx: float, dy: float) -> None:
        if self.is_windows:
            ctypes.windll.user32.mouse_event(MOUSEEVENTF_MOVE, int(dx), int(dy), 0, 0)
        elif self.mouse:
            try:
                self.mouse.move(int(dx), int(dy))
            except Exception:
                pass

    def click(self, button: str = "left", state: str = "click") -> None:
        if self.is_windows:
            down_flag = MOUSEEVENTF_LEFTDOWN if button == "left" else (MOUSEEVENTF_RIGHTDOWN if button == "right" else MOUSEEVENTF_MIDDLEDOWN)
            up_flag = MOUSEEVENTF_LEFTUP if button == "left" else (MOUSEEVENTF_RIGHTUP if button == "right" else MOUSEEVENTF_MIDDLEUP)

            if state == "click":
                ctypes.windll.user32.mouse_event(down_flag, 0, 0, 0, 0)
                time.sleep(0.015)
                ctypes.windll.user32.mouse_event(up_flag, 0, 0, 0, 0)
            elif state == "down":
                ctypes.windll.user32.mouse_event(down_flag, 0, 0, 0, 0)
            elif state == "up":
                ctypes.windll.user32.mouse_event(up_flag, 0, 0, 0, 0)
        elif self.mouse:
            btn = Button.left if button == "left" else (Button.right if button == "right" else Button.middle)
            if state == "down":
                self.mouse.press(btn)
            elif state == "up":
                self.mouse.release(btn)
            else:
                self.mouse.click(btn, 1)

    def scroll(self, dx: float, dy: float) -> None:
        if self.is_windows:
            if dy != 0:
                ctypes.windll.user32.mouse_event(MOUSEEVENTF_WHEEL, 0, 0, int(dy * 120), 0)
            if dx != 0:
                ctypes.windll.user32.mouse_event(MOUSEEVENTF_HWHEEL, 0, 0, int(dx * 120), 0)
        elif self.mouse:
            self.mouse.scroll(int(dx), int(dy))

    def press_key(self, key_name: str) -> None:
        norm = key_name.lower().strip()

        # Compound shortcut handling
        if norm in ("ctrl_c", "ctrl+c"):
            with self.keyboard.pressed(Key.ctrl):
                self.keyboard.press('c')
                self.keyboard.release('c')
            return
        elif norm in ("ctrl_v", "ctrl+v"):
            with self.keyboard.pressed(Key.ctrl):
                self.keyboard.press('v')
                self.keyboard.release('v')
            return
        elif norm in ("ctrl_z", "ctrl+z"):
            with self.keyboard.pressed(Key.ctrl):
                self.keyboard.press('z')
                self.keyboard.release('z')
            return
        elif norm in ("ctrl_a", "ctrl+a"):
            with self.keyboard.pressed(Key.ctrl):
                self.keyboard.press('a')
                self.keyboard.release('a')
            return
        elif norm in ("ctrl_w", "ctrl+w"):
            with self.keyboard.pressed(Key.ctrl):
                self.keyboard.press('w')
                self.keyboard.release('w')
            return
        elif norm in ("alt_f4", "alt+f4"):
            with self.keyboard.pressed(Key.alt):
                self.keyboard.press(Key.f4)
                self.keyboard.release(Key.f4)
            return

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
            "win": Key.cmd,
            "ctrl": Key.ctrl,
            "alt": Key.alt,
            "shift": Key.shift,
            "delete": Key.delete,
            "del": Key.delete,
            "home": Key.home,
            "end": Key.end,
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
            time.sleep(0.015)
            self.keyboard.release(k)
        elif len(norm) == 1:
            self.keyboard.press(norm)
            time.sleep(0.015)
            self.keyboard.release(norm)

    def type_text(self, text: str) -> None:
        if self.is_windows:
            KEYEVENTF_KEYUP = 0x0002
            KEYEVENTF_UNICODE = 0x0004
            VK_RETURN = 0x0D
            VK_TAB = 0x09
            VK_BACK = 0x08

            user32 = ctypes.windll.user32
            for char in text:
                if char in ("\n", "\r"):
                    user32.keybd_event(VK_RETURN, 0, 0, 0)
                    time.sleep(0.005)
                    user32.keybd_event(VK_RETURN, 0, KEYEVENTF_KEYUP, 0)
                elif char == "\t":
                    user32.keybd_event(VK_TAB, 0, 0, 0)
                    time.sleep(0.005)
                    user32.keybd_event(VK_TAB, 0, KEYEVENTF_KEYUP, 0)
                elif char == "\b":
                    user32.keybd_event(VK_BACK, 0, 0, 0)
                    time.sleep(0.005)
                    user32.keybd_event(VK_BACK, 0, KEYEVENTF_KEYUP, 0)
                else:
                    # Send exact unicode code units (bypasses host Caps Lock and layout)
                    utf16_bytes = char.encode("utf-16le")
                    for i in range(0, len(utf16_bytes), 2):
                        scan_code = utf16_bytes[i] | (utf16_bytes[i + 1] << 8)
                        user32.keybd_event(0, scan_code, KEYEVENTF_UNICODE, 0)
                        user32.keybd_event(0, scan_code, KEYEVENTF_UNICODE | KEYEVENTF_KEYUP, 0)
                    time.sleep(0.002)
        elif self.keyboard:
            self.keyboard.type(text)

    def gesture(self, action: str) -> None:
        import sys
        is_windows = sys.platform == "win32"

        if action == "overview":
            if is_windows:
                # Windows Task View (Win + Tab)
                with self.keyboard.pressed(Key.cmd):
                    self.keyboard.press(Key.tab)
                    self.keyboard.release(Key.tab)
            else:
                # Linux Super key
                self.keyboard.press(Key.cmd)
                time.sleep(0.02)
                self.keyboard.release(Key.cmd)
        elif action == "desktop":
            # Super + D / Win + D
            with self.keyboard.pressed(Key.cmd):
                self.keyboard.press('d')
                self.keyboard.release('d')
        elif action == "workspace_next":
            if is_windows:
                # Win + Ctrl + Right
                with self.keyboard.pressed(Key.cmd), self.keyboard.pressed(Key.ctrl):
                    self.keyboard.press(Key.right)
                    self.keyboard.release(Key.right)
            else:
                with self.keyboard.pressed(Key.ctrl), self.keyboard.pressed(Key.alt):
                    self.keyboard.press(Key.right)
                    self.keyboard.release(Key.right)
        elif action == "workspace_prev":
            if is_windows:
                # Win + Ctrl + Left
                with self.keyboard.pressed(Key.cmd), self.keyboard.pressed(Key.ctrl):
                    self.keyboard.press(Key.left)
                    self.keyboard.release(Key.left)
            else:
                with self.keyboard.pressed(Key.ctrl), self.keyboard.pressed(Key.alt):
                    self.keyboard.press(Key.left)
                    self.keyboard.release(Key.left)
