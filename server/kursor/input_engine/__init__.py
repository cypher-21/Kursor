import os
import sys
from .base import InputBackend
from .uinput_backend import UInputBackend, HAVE_EVDEV
from .ydotool_backend import YdotoolBackend
from .x11_backend import X11Backend, HAVE_PYNPUT


def create_input_backend(preference: str = "auto") -> InputBackend:
    """
    Instantiate the best available input backend.
    Order of preference on Linux:
    1. uinput (Kernel-level, universal on Wayland & X11)
    2. ydotool (Wayland daemon fallback)
    3. pynput / X11
    """
    is_linux = sys.platform.startswith("linux")
    is_wayland = bool(os.environ.get("WAYLAND_DISPLAY"))

    if preference == "uinput":
        return UInputBackend()
    elif preference == "ydotool":
        return YdotoolBackend()
    elif preference in ("x11", "pynput"):
        return X11Backend()

    # Auto-detection
    if is_linux:
        # Try uinput first (works on both Wayland and X11)
        if HAVE_EVDEV:
            try:
                return UInputBackend()
            except Exception as e:
                print(f"[InputEngine] Note: uinput unavailable ({e}), falling back...")

        # If on Wayland, try ydotool
        if is_wayland:
            try:
                return YdotoolBackend()
            except Exception as e:
                print(f"[InputEngine] Note: ydotool unavailable ({e}), falling back...")

    # Try pynput / X11
    if HAVE_PYNPUT:
        try:
            return X11Backend()
        except Exception as e:
            print(f"[InputEngine] Note: pynput failed: {e}")

    if is_wayland:
        print(
            "[InputEngine] ERROR: Wayland desktop detected but no Wayland-capable input driver is active.\n"
            "              Mouse input will be dropped. Fix with one of:\n"
            "                1. Install python-evdev (pip install evdev) so the uinput backend works\n"
            "                2. Run server/setup-uinput.sh for non-root /dev/uinput permissions\n"
            "                3. Install ydotool (package manager) and start 'ydotoold'\n"
            "                4. Log into an X11 session instead of Wayland"
        )

    # Fallback dummy backend for testing
    print("[InputEngine] Warning: No functional input driver found. Running in MOCK mode.")
    class DummyBackend(InputBackend):
        def move(self, dx: float, dy: float) -> None:
            pass
        def click(self, button: str = "left", state: str = "click") -> None:
            print(f"[MockInput] Click {button} {state}")
        def scroll(self, dx: float, dy: float) -> None:
            pass
        def press_key(self, key_name: str) -> None:
            print(f"[MockInput] Key {key_name}")
        def type_text(self, text: str) -> None:
            print(f"[MockInput] Type: {text}")
        def gesture(self, action: str) -> None:
            print(f"[MockInput] Gesture: {action}")
    return DummyBackend()
