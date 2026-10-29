import sys
import time
from typing import Optional
from .base import InputBackend

try:
    import evdev  # type: ignore
    from evdev import UInput, ecodes as e  # type: ignore
    HAVE_EVDEV = True
except ImportError:
    HAVE_EVDEV = False

if sys.platform.startswith("linux"):
    from .raw_uinput import RawUInput
else:  # pragma: no cover - raw backend is Linux-only
    RawUInput = None  # type: ignore[assignment]

KEY_MAP = {
    "page_down": "KEY_PAGEDOWN",
    "pagedown": "KEY_PAGEDOWN",
    "page_up": "KEY_PAGEUP",
    "pageup": "KEY_PAGEUP",
    "f5": "KEY_F5",
    "escape": "KEY_ESC",
    "esc": "KEY_ESC",
    "b": "KEY_B",
    "w": "KEY_W",
    "left": "KEY_LEFT",
    "right": "KEY_RIGHT",
    "up": "KEY_UP",
    "down": "KEY_DOWN",
    "enter": "KEY_ENTER",
    "return": "KEY_ENTER",
    "backspace": "KEY_BACKSPACE",
    "tab": "KEY_TAB",
    "space": "KEY_SPACE",
    "super": "KEY_LEFTMETA",
    "win": "KEY_LEFTMETA",
    "ctrl": "KEY_LEFTCTRL",
    "alt": "KEY_LEFTALT",
    "shift": "KEY_LEFTSHIFT",
    "delete": "KEY_DELETE",
    "del": "KEY_DELETE",
    "home": "KEY_HOME",
    "end": "KEY_END",
    "volume_up": "KEY_VOLUMEUP",
    "volume_down": "KEY_VOLUMEDOWN",
    "mute": "KEY_MUTE",
    "play_pause": "KEY_PLAYPAUSE",
    "next_track": "KEY_NEXTSONG",
    "prev_track": "KEY_PREVIOUSSONG",
    "print": "KEY_PRINT",
    "print_screen": "KEY_PRINT",
}

class UInputBackend(InputBackend):
    """
    Universal Linux Kernel uinput Backend.
    Creates a virtual input device through /dev/uinput.
    Works natively on both Wayland (GNOME, KDE Plasma, Sway, Hyprland) and X11.
    """

    def __init__(self):
        if not HAVE_EVDEV:
            raise RuntimeError("Python 'evdev' module is not installed. Install via: pip install evdev")

        # Define capabilities for virtual mouse & keyboard
        key_caps = [
            e.BTN_LEFT, e.BTN_RIGHT, e.BTN_MIDDLE, e.BTN_SIDE, e.BTN_EXTRA,
            e.KEY_ESC, e.KEY_F5, e.KEY_PAGEDOWN, e.KEY_PAGEUP,
            e.KEY_LEFT, e.KEY_RIGHT, e.KEY_UP, e.KEY_DOWN,
            e.KEY_B, e.KEY_W, e.KEY_ENTER, e.KEY_BACKSPACE, e.KEY_TAB, e.KEY_SPACE,
            e.KEY_LEFTMETA, e.KEY_D, e.KEY_LEFTCTRL, e.KEY_LEFTALT, e.KEY_LEFTSHIFT,
            e.KEY_VOLUMEUP, e.KEY_VOLUMEDOWN, e.KEY_MUTE,
            e.KEY_PLAYPAUSE, e.KEY_NEXTSONG, e.KEY_PREVIOUSSONG,
            getattr(e, "KEY_PRINT", None),   # None on some old evdev releases
        ]
        cap = {
            e.EV_REL: [e.REL_X, e.REL_Y, e.REL_WHEEL, e.REL_HWHEEL],
            e.EV_KEY: [k for k in key_caps if k is not None],
        }
        # Add basic alphanumeric keys
        for key_code in range(e.KEY_1, e.KEY_EQUAL + 1):
            cap[e.EV_KEY].append(key_code)
        for key_code in range(e.KEY_Q, e.KEY_SLASH + 1):
            cap[e.EV_KEY].append(key_code)

        # Shifted punctuation produced by the mobile keyboard ( e.g. ! @ # ? )
        for extra_key in (
            e.KEY_COMMA, e.KEY_DOT, e.KEY_MINUS, e.KEY_EQUAL, e.KEY_SEMICOLON,
            e.KEY_APOSTROPHE, e.KEY_GRAVE, e.KEY_LEFTBRACE, e.KEY_RIGHTBRACE,
            e.KEY_BACKSLASH, e.KEY_F4
        ):
            if extra_key is not None and extra_key not in cap[e.EV_KEY]:
                cap[e.EV_KEY].append(extra_key)

        # Function keys (F1-F12): needed for alt_f4 and other presenter combos
        for fkey in ("KEY_F1", "KEY_F2", "KEY_F3", "KEY_F4", "KEY_F5",
                     "KEY_F6", "KEY_F7", "KEY_F8", "KEY_F9", "KEY_F10",
                     "KEY_F11", "KEY_F12"):
            code = getattr(e, fkey, None)
            if code is not None and code not in cap[e.EV_KEY]:
                cap[e.EV_KEY].append(code)

        try:
            self.device = UInput(cap, name="Mousely Virtual Remote", version=0x1)
            print("[UInputBackend] Successfully initialized /dev/uinput virtual input device (evdev)")
        except Exception as evdev_exc:
            evdev_error = str(evdev_exc)
            # python-evdev demands O_RDWR; many udev setups (MODE="0220") only grant
            # write. The kernel only needs write access, so try the raw fallback.
            raw = None
            if RawUInput is not None:
                try:
                    rel = [getattr(e, n) for n in ("REL_X", "REL_Y", "REL_WHEEL", "REL_HWHEEL")]
                    keys = list(dict.fromkeys(cap[e.EV_KEY]))
                    raw = RawUInput("Mousely Virtual Remote", rel, keys)
                    self.device = raw
                    print("[UInputBackend] Successfully initialized /dev/uinput virtual input device (raw write-only mode)")
                except Exception as raw_exc:
                    raw_error = str(raw_exc)
            self.device = raw  # None if raw fallback also failed
            if raw is None:
                if isinstance(evdev_exc, PermissionError) or "could not open" in evdev_error:
                    raise PermissionError(
                        "Access to /dev/uinput denied. Run 'setup-uinput.sh' or add your user to 'input' group."
                    )
                raise RuntimeError(f"Failed to open /dev/uinput: {evdev_error}")

        self.remainder_x = 0.0
        self.remainder_y = 0.0
        self.remainder_scroll_y = 0.0
        self.remainder_scroll_x = 0.0

    def move(self, dx: float, dy: float) -> None:
        self.remainder_x += dx
        self.remainder_y += dy

        int_x = int(self.remainder_x)
        int_y = int(self.remainder_y)

        if int_x != 0 or int_y != 0:
            self.remainder_x -= int_x
            self.remainder_y -= int_y
            self.device.write(e.EV_REL, e.REL_X, int_x)
            self.device.write(e.EV_REL, e.REL_Y, int_y)
            self.device.syn()

    def click(self, button: str = "left", state: str = "click") -> None:
        btn_code = e.BTN_LEFT
        if button == "right":
            btn_code = e.BTN_RIGHT
        elif button == "middle":
            btn_code = e.BTN_MIDDLE

        if state == "down":
            self.device.write(e.EV_KEY, btn_code, 1)
            self.device.syn()
        elif state == "up":
            self.device.write(e.EV_KEY, btn_code, 0)
            self.device.syn()
        else:  # "click"
            self.device.write(e.EV_KEY, btn_code, 1)
            self.device.syn()
            time.sleep(0.015)
            self.device.write(e.EV_KEY, btn_code, 0)
            self.device.syn()

    def scroll(self, dx: float, dy: float) -> None:
        self.remainder_scroll_y += dy
        self.remainder_scroll_x += dx

        steps_y = int(self.remainder_scroll_y)
        steps_x = int(self.remainder_scroll_x)

        if steps_y != 0:
            self.remainder_scroll_y -= steps_y
            # On Linux uinput, positive REL_WHEEL is scroll up, negative is scroll down
            self.device.write(e.EV_REL, e.REL_WHEEL, steps_y)
            self.device.syn()

        if steps_x != 0:
            self.remainder_scroll_x -= steps_x
            self.device.write(e.EV_REL, e.REL_HWHEEL, steps_x)
            self.device.syn()

    def press_key(self, key_name: str) -> None:
        norm = key_name.lower().strip()

        # Compound shortcut handling
        if norm in ("ctrl_c", "ctrl+c"):
            self.device.write(e.EV_KEY, e.KEY_LEFTCTRL, 1)
            self.device.write(e.EV_KEY, e.KEY_C, 1)
            self.device.syn()
            time.sleep(0.02)
            self.device.write(e.EV_KEY, e.KEY_C, 0)
            self.device.write(e.EV_KEY, e.KEY_LEFTCTRL, 0)
            self.device.syn()
            return
        elif norm in ("ctrl_v", "ctrl+v"):
            self.device.write(e.EV_KEY, e.KEY_LEFTCTRL, 1)
            self.device.write(e.EV_KEY, e.KEY_V, 1)
            self.device.syn()
            time.sleep(0.02)
            self.device.write(e.EV_KEY, e.KEY_V, 0)
            self.device.write(e.EV_KEY, e.KEY_LEFTCTRL, 0)
            self.device.syn()
            return
        elif norm in ("ctrl_z", "ctrl+z"):
            self.device.write(e.EV_KEY, e.KEY_LEFTCTRL, 1)
            self.device.write(e.EV_KEY, e.KEY_Z, 1)
            self.device.syn()
            time.sleep(0.02)
            self.device.write(e.EV_KEY, e.KEY_Z, 0)
            self.device.write(e.EV_KEY, e.KEY_LEFTCTRL, 0)
            self.device.syn()
            return
        elif norm in ("ctrl_a", "ctrl+a"):
            self.device.write(e.EV_KEY, e.KEY_LEFTCTRL, 1)
            self.device.write(e.EV_KEY, e.KEY_A, 1)
            self.device.syn()
            time.sleep(0.02)
            self.device.write(e.EV_KEY, e.KEY_A, 0)
            self.device.write(e.EV_KEY, e.KEY_LEFTCTRL, 0)
            self.device.syn()
            return
        elif norm in ("ctrl_w", "ctrl+w"):
            self.device.write(e.EV_KEY, e.KEY_LEFTCTRL, 1)
            self.device.write(e.EV_KEY, e.KEY_W, 1)
            self.device.syn()
            time.sleep(0.02)
            self.device.write(e.EV_KEY, e.KEY_W, 0)
            self.device.write(e.EV_KEY, e.KEY_LEFTCTRL, 0)
            self.device.syn()
            return
        elif norm in ("alt_f4", "alt+f4"):
            self.device.write(e.EV_KEY, e.KEY_LEFTALT, 1)
            self.device.write(e.EV_KEY, e.KEY_F4, 1)
            self.device.syn()
            time.sleep(0.02)
            self.device.write(e.EV_KEY, e.KEY_F4, 0)
            self.device.write(e.EV_KEY, e.KEY_LEFTALT, 0)
            self.device.syn()
            return
        elif norm in ("ctrl_plus", "ctrl+plus", "zoom_in"):
            self._combo_two(e.KEY_LEFTCTRL, e.KEY_EQUAL)
            return
        elif norm in ("ctrl_minus", "ctrl+minus", "zoom_out"):
            self._combo_two(e.KEY_LEFTCTRL, e.KEY_MINUS)
            return
        elif norm in ("ctrl_0", "ctrl+0", "zoom_reset"):
            self._combo_two(e.KEY_LEFTCTRL, e.KEY_0)
            return
        elif norm in ("win_l", "win+l", "lock"):
            self._combo_two(e.KEY_LEFTMETA, e.KEY_L)
            return
        elif norm in ("win_shift_s", "win+shift+s", "shot_snip"):
            self._combo_three(e.KEY_LEFTMETA, e.KEY_LEFTSHIFT, e.KEY_S)
            return

        code_name = KEY_MAP.get(norm)
        if not code_name and hasattr(e, f"KEY_{norm.upper()}"):
            code_name = f"KEY_{norm.upper()}"

        if code_name and hasattr(e, code_name):
            key_val = getattr(e, code_name)
            self.device.write(e.EV_KEY, key_val, 1)
            self.device.syn()
            time.sleep(0.02)
            self.device.write(e.EV_KEY, key_val, 0)
            self.device.syn()
        else:
            print(f"[UInputBackend] Key not recognized: {key_name}")

    # Chars typed without shift, and their shifted counterparts
    _TEXT_KEYS = {
        "1": "KEY_1", "2": "KEY_2", "3": "KEY_3", "4": "KEY_4", "5": "KEY_5",
        "6": "KEY_6", "7": "KEY_7", "8": "KEY_8", "9": "KEY_9", "0": "KEY_0",
        ",": "KEY_COMMA", ".": "KEY_DOT", "-": "KEY_MINUS", "=": "KEY_EQUAL",
        ";": "KEY_SEMICOLON", "'": "KEY_APOSTROPHE", "`": "KEY_GRAVE",
        "[": "KEY_LEFTBRACE", "]": "KEY_RIGHTBRACE", "\\": "KEY_BACKSLASH",
        "/": "KEY_SLASH",
        "!": "KEY_1", "@": "KEY_2", "#": "KEY_3", "$": "KEY_4", "%": "KEY_5",
        "^": "KEY_6", "&": "KEY_7", "*": "KEY_8", "(": "KEY_9", ")": "KEY_0",
        "_": "KEY_MINUS", "+": "KEY_EQUAL", ":": "KEY_SEMICOLON",
        '"': "KEY_APOSTROPHE", "~": "KEY_GRAVE", "{": "KEY_LEFTBRACE",
        "}": "KEY_RIGHTBRACE", "|": "KEY_BACKSLASH", "?": "KEY_SLASH",
        "<": "KEY_COMMA", ">": "KEY_DOT",
        "_SHIFT_REQUIRED_": "!@#$%^&*()_+{}|?:\"<>~",
    }

    def _combo_two(self, mod_code: int, key_code: int) -> None:
        """Press-and-release a single-modifier combo (Ctrl/X, Win/X)."""
        self.device.write(e.EV_KEY, mod_code, 1)
        self.device.write(e.EV_KEY, key_code, 1)
        self.device.syn()
        time.sleep(0.02)
        self.device.write(e.EV_KEY, key_code, 0)
        self.device.write(e.EV_KEY, mod_code, 0)
        self.device.syn()

    def _combo_three(self, mod1: int, mod2: int, key_code: int) -> None:
        """Press-and-release a two-modifier combo (Win+Shift+S)."""
        self.device.write(e.EV_KEY, mod1, 1)
        self.device.write(e.EV_KEY, mod2, 1)
        self.device.write(e.EV_KEY, key_code, 1)
        self.device.syn()
        time.sleep(0.02)
        self.device.write(e.EV_KEY, key_code, 0)
        self.device.write(e.EV_KEY, mod2, 0)
        self.device.write(e.EV_KEY, mod1, 0)
        self.device.syn()

    def type_text(self, text: str) -> None:
        shift_chars = self._TEXT_KEYS["_SHIFT_REQUIRED_"]
        for char in text:
            if char == "\n":
                self.press_key("enter")
            elif char == "\t":
                self.press_key("tab")
            elif char == " ":
                self.press_key("space")
            elif char.isascii() and char.isalpha():
                # Letters A-Z / a-z (shift for capitals, bypasses host caps lock)
                self._press_combo("KEY_" + char.upper(), shift=char.isupper())
            elif char in self._TEXT_KEYS and char != "_SHIFT_REQUIRED_":
                self._press_combo(self._TEXT_KEYS[char], shift=char in shift_chars)
            else:
                print(f"[UInputBackend] Character not typed (unsupported): {char!r}")

    def _press_combo(self, key_code_name: str, shift: bool = False) -> None:
        if not hasattr(e, key_code_name):
            return
        k = getattr(e, key_code_name)
        if shift:
            self.device.write(e.EV_KEY, e.KEY_LEFTSHIFT, 1)
            self.device.syn()
        self.device.write(e.EV_KEY, k, 1)
        self.device.syn()
        time.sleep(0.01)
        self.device.write(e.EV_KEY, k, 0)
        self.device.syn()
        if shift:
            self.device.write(e.EV_KEY, e.KEY_LEFTSHIFT, 0)
            self.device.syn()

    def gesture(self, action: str) -> None:
        if action == "overview":
            # Tap Super / Meta key to toggle GNOME / KDE overview
            self.device.write(e.EV_KEY, e.KEY_LEFTMETA, 1)
            self.device.syn()
            time.sleep(0.03)
            self.device.write(e.EV_KEY, e.KEY_LEFTMETA, 0)
            self.device.syn()
        elif action == "desktop":
            # Super + D to show desktop
            self.device.write(e.EV_KEY, e.KEY_LEFTMETA, 1)
            self.device.write(e.EV_KEY, e.KEY_D, 1)
            self.device.syn()
            time.sleep(0.03)
            self.device.write(e.EV_KEY, e.KEY_D, 0)
            self.device.write(e.EV_KEY, e.KEY_LEFTMETA, 0)
            self.device.syn()
        elif action == "workspace_next":
            # Ctrl + Alt + Right or Super + PageDown
            self.device.write(e.EV_KEY, e.KEY_LEFTCTRL, 1)
            self.device.write(e.EV_KEY, e.KEY_LEFTALT, 1)
            self.device.write(e.EV_KEY, e.KEY_RIGHT, 1)
            self.device.syn()
            time.sleep(0.03)
            self.device.write(e.EV_KEY, e.KEY_RIGHT, 0)
            self.device.write(e.EV_KEY, e.KEY_LEFTALT, 0)
            self.device.write(e.EV_KEY, e.KEY_LEFTCTRL, 0)
            self.device.syn()
        elif action == "workspace_prev":
            # Ctrl + Alt + Left
            self.device.write(e.EV_KEY, e.KEY_LEFTCTRL, 1)
            self.device.write(e.EV_KEY, e.KEY_LEFTALT, 1)
            self.device.write(e.EV_KEY, e.KEY_LEFT, 1)
            self.device.syn()
            time.sleep(0.03)
            self.device.write(e.EV_KEY, e.KEY_LEFT, 0)
            self.device.write(e.EV_KEY, e.KEY_LEFTALT, 0)
            self.device.write(e.EV_KEY, e.KEY_LEFTCTRL, 0)
            self.device.syn()

    def cleanup(self) -> None:
        if hasattr(self, "device") and self.device:
            self.device.close()
