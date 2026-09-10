import time
from typing import Optional
from .base import InputBackend

try:
    import evdev  # type: ignore
    from evdev import UInput, ecodes as e  # type: ignore
    HAVE_EVDEV = True
except ImportError:
    HAVE_EVDEV = False

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
        cap = {
            e.EV_REL: [e.REL_X, e.REL_Y, e.REL_WHEEL, e.REL_HWHEEL],
            e.EV_KEY: [
                e.BTN_LEFT, e.BTN_RIGHT, e.BTN_MIDDLE, e.BTN_SIDE, e.BTN_EXTRA,
                e.KEY_ESC, e.KEY_F5, e.KEY_PAGEDOWN, e.KEY_PAGEUP,
                e.KEY_LEFT, e.KEY_RIGHT, e.KEY_UP, e.KEY_DOWN,
                e.KEY_B, e.KEY_W, e.KEY_ENTER, e.KEY_BACKSPACE, e.KEY_TAB, e.KEY_SPACE,
                e.KEY_LEFTMETA, e.KEY_D, e.KEY_LEFTCTRL, e.KEY_LEFTALT, e.KEY_LEFTSHIFT,
                e.KEY_VOLUMEUP, e.KEY_VOLUMEDOWN, e.KEY_MUTE,
                e.KEY_PLAYPAUSE, e.KEY_NEXTSONG, e.KEY_PREVIOUSSONG
            ]
        }
        # Add basic alphanumeric keys
        for key_code in range(e.KEY_1, e.KEY_EQUAL + 1):
            cap[e.EV_KEY].append(key_code)
        for key_code in range(e.KEY_Q, e.KEY_SLASH + 1):
            cap[e.EV_KEY].append(key_code)

        try:
            self.device = UInput(cap, name="Mousely Virtual Remote", version=0x1)
            print("[UInputBackend] Successfully initialized /dev/uinput virtual input device")
        except PermissionError:
            raise PermissionError(
                "Access to /dev/uinput denied. Run 'setup-uinput.sh' or add your user to 'input' group."
            )
        except Exception as exc:
            raise RuntimeError(f"Failed to open /dev/uinput: {exc}")

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

    def type_text(self, text: str) -> None:
        for char in text:
            if char == "\n":
                self.press_key("enter")
            elif char == " ":
                self.press_key("space")
            else:
                key_code_name = f"KEY_{char.upper()}"
                if hasattr(e, key_code_name):
                    k = getattr(e, key_code_name)
                    # Check if shift is needed for uppercase
                    shift = char.isupper()
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
