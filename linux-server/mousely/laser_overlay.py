import sys
import threading
import queue
from typing import Optional

class LaserOverlay:
    """
    On-screen transparent overlay for Mousely Digital Laser Pointer & Presentation Spotlight.
    Draws a glowing red/green laser dot or presentation spotlight centered on cursor/gyro target.
    """

    def __init__(self, color: str = "#ff2a5f", dot_size: int = 16, spotlight_radius: int = 120):
        self.color = color
        self.dot_size = dot_size
        self.spotlight_radius = spotlight_radius
        self.is_active = False
        self.current_mode = "laser"  # 'laser' or 'spotlight'
        self.target_x = 0
        self.target_y = 0

        self._cmd_queue: queue.Queue = queue.Queue()
        self._thread: Optional[threading.Thread] = None
        self._root = None
        self._canvas = None

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
        if x is not None and y is not None:
            self.target_x = x
            self.target_y = y
        self._cmd_queue.put(("update", active, self.target_x, self.target_y, mode))

    def _run_ui(self):
        try:
            import tkinter as tk
        except ImportError:
            print("[LaserOverlay] Tkinter not available, visual overlay disabled.")
            return

        try:
            self._root = tk.Tk()
            self._root.title("Mousely Laser Overlay")
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
            else:
                try:
                    self._root.wait_visibility(self._root)
                    self._root.attributes("-alpha", 0.95)
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

            # Polling loop for queue commands
            def poll_commands():
                try:
                    while not self._cmd_queue.empty():
                        cmd, active, x, y, mode = self._cmd_queue.get_nowait()
                        self._canvas.delete("all")
                        if active:
                            self._draw_pointer(x, y, mode)
                except Exception:
                    pass
                self._root.after(16, poll_commands)

            self._root.after(16, poll_commands)
            self._root.mainloop()
        except Exception as e:
            print(f"[LaserOverlay] UI loop exited: {e}")

    def _draw_pointer(self, x: int, y: int, mode: str):
        if not self._canvas:
            return

        if mode == "spotlight":
            # Presentation Spotlight: dim background with clear circle around cursor
            r = self.spotlight_radius
            self._canvas.create_oval(
                x - r, y - r, x + r, y + r,
                outline=self.color, width=3
            )
        else:
            # Laser Pointer: Glowing halo and central core dot
            r = self.dot_size
            # Outer glow halo
            self._canvas.create_oval(
                x - r * 1.6, y - r * 1.6, x + r * 1.6, y + r * 1.6,
                fill=self.color, outline="", stipple="gray50"
            )
            # Inner intense laser dot
            self._canvas.create_oval(
                x - r, y - r, x + r, y + r,
                fill="#ffffff", outline=self.color, width=2
            )
