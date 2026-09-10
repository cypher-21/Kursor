import sys
import threading
import queue
import time
from typing import Optional, Tuple

class LaserOverlay:
    """
    On-screen transparent overlay for Kursor Digital Laser Pointer & Presentation Spotlight.
    Draws a glowing red laser dot or presentation spotlight centered on cursor/gyro target.
    """

    def __init__(self, color: str = "#ff2a5f", dot_size: int = 14, spotlight_radius: int = 90):
        self.color = color
        self.dot_size = dot_size
        self.spotlight_radius = spotlight_radius
        self.is_active = False
        self.current_mode = "laser"  # 'laser' or 'spotlight'
        self.explicit_coords = False
        self.target_x = 0
        self.target_y = 0

        self._cmd_queue: queue.Queue = queue.Queue()
        self._thread: Optional[threading.Thread] = None
        self._root = None
        self._canvas = None
        self._mouse_controller = None

    def start(self):
        if self._thread and self._thread.is_alive():
            return
        self._thread = threading.Thread(target=self._run_ui, daemon=True)
        self._thread.start()

    def update_pointer(self, active: bool, x: Optional[int] = None, y: Optional[int] = None, mode: str = "laser"):
        self.is_active = active
        self.current_mode = mode
        if active:
            self.start()
        self._cmd_queue.put(("update", active, x, y, mode))

    def _get_cursor_pos(self) -> Tuple[int, int]:
        if sys.platform == "win32":
            try:
                import ctypes
                from ctypes import wintypes
                class POINT(ctypes.Structure):
                    _fields_ = [("x", wintypes.LONG), ("y", wintypes.LONG)]
                pt = POINT()
                if ctypes.windll.user32.GetCursorPos(ctypes.byref(pt)):
                    return int(pt.x), int(pt.y)
            except Exception:
                pass

        # Fallback to pynput or default
        try:
            if self._mouse_controller is None:
                from pynput.mouse import Controller
                self._mouse_controller = Controller()
            pos = self._mouse_controller.position
            return int(pos[0]), int(pos[1])
        except Exception:
            return 960, 540

    def _run_ui(self):
        try:
            import tkinter as tk
        except ImportError:
            print("[LaserOverlay] Tkinter not available, visual overlay disabled.")
            return

        try:
            self._root = tk.Tk()
            self._root.title("Kursor Laser Overlay")
            self._root.attributes("-topmost", True)
            self._root.overrideredirect(True)

            screen_w = self._root.winfo_screenwidth()
            screen_h = self._root.winfo_screenheight()
            self._root.geometry(f"{screen_w}x{screen_h}+0+0")

            # Platform-specific transparency
            bg_key = "#010101"
            if sys.platform == "win32":
                self._root.config(bg=bg_key)
                self._root.attributes("-transparentcolor", bg_key)

                # Make transparent window click-through so slide clicks work
                try:
                    import ctypes
                    GWL_EXSTYLE = -20
                    WS_EX_TRANSPARENT = 0x00000020
                    WS_EX_LAYERED = 0x00080000
                    hwnd = ctypes.windll.user32.GetParent(self._root.winfo_id())
                    styles = ctypes.windll.user32.GetWindowLongW(hwnd, GWL_EXSTYLE)
                    ctypes.windll.user32.SetWindowLongW(
                        hwnd, GWL_EXSTYLE, styles | WS_EX_LAYERED | WS_EX_TRANSPARENT
                    )
                except Exception as e:
                    print(f"[LaserOverlay] Note: could not apply WS_EX_TRANSPARENT: {e}")
            else:
                try:
                    self._root.wait_visibility(self._root)
                    self._root.attributes("-alpha", 0.92)
                    self._root.config(bg=bg_key)
                except Exception:
                    self._root.config(bg=bg_key)

            self._canvas = tk.Canvas(
                self._root,
                width=screen_w,
                height=screen_h,
                bg=bg_key,
                highlightthickness=0
            )
            self._canvas.pack(fill="both", expand=True)

            # Polling loop for tracking cursor and redrawing pointer
            def poll_loop():
                try:
                    while not self._cmd_queue.empty():
                        cmd, active, x, y, mode = self._cmd_queue.get_nowait()
                        self.is_active = active
                        self.current_mode = mode
                        if x is not None and y is not None:
                            self.explicit_coords = True
                            self.target_x = x
                            self.target_y = y
                        else:
                            self.explicit_coords = False

                    self._canvas.delete("all")
                    if self.is_active:
                        if self.explicit_coords:
                            px, py = self.target_x, self.target_y
                        else:
                            px, py = self._get_cursor_pos()

                        self._draw_pointer(px, py, self.current_mode)
                except Exception:
                    pass

                self._root.after(16, poll_loop)

            self._root.after(16, poll_loop)
            self._root.mainloop()
        except Exception as e:
            print(f"[LaserOverlay] UI loop exited: {e}")

    def _draw_pointer(self, x: int, y: int, mode: str):
        if not self._canvas:
            return

        if mode == "spotlight":
            # Presentation Spotlight: clear highlighted circular area
            r = self.spotlight_radius
            # Outer golden spotlight ring
            self._canvas.create_oval(
                x - r, y - r, x + r, y + r,
                outline="#facc15", width=3
            )
            self._canvas.create_oval(
                x - r - 3, y - r - 3, x + r + 3, y + r + 3,
                outline="rgba(250, 204, 21, 0.4)", width=2
            )
            # Center subtle dot
            self._canvas.create_oval(
                x - 4, y - 4, x + 4, y + 4,
                fill="#facc15", outline="#ffffff", width=1
            )
        else:
            # Laser Pointer: Glowing halo + intense laser ring + bright core dot
            r = self.dot_size
            # 1. Outer radiant glow
            self._canvas.create_oval(
                x - r * 2.2, y - r * 2.2, x + r * 2.2, y + r * 2.2,
                fill=self.color, outline=""
            )
            # 2. Concentrated laser beam
            self._canvas.create_oval(
                x - r * 1.2, y - r * 1.2, x + r * 1.2, y + r * 1.2,
                fill="#ff003b", outline="#ffffff", width=1
            )
            # 3. Blinding white center reflection
            self._canvas.create_oval(
                x - r * 0.45, y - r * 0.45, x + r * 0.45, y + r * 0.45,
                fill="#ffffff", outline=""
            )
