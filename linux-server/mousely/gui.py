import sys
import io
import webbrowser
from pathlib import Path
from typing import Optional, List
import qrcode
from PIL import Image, ImageTk

try:
    import tkinter as tk
    from tkinter import ttk, messagebox
    HAVE_TK = True
except ImportError:
    HAVE_TK = False

from .config import load_config, save_config
from .discovery import get_local_ips

class MouselyGUI:
    """
    Desktop Pairing & Settings Window for Mousely Linux.
    Displays QR Code for instant phone camera pairing and allows tuning controls.
    """

    def __init__(self, port: int = 8765):
        if not HAVE_TK:
            raise RuntimeError("Tkinter is not available. Please run with --cli for headless mode.")
        self.port = port
        self.config = load_config()
        self.root = None
        self.qr_photo = None

    def start(self):
        self.root = tk.Tk()
        self.root.title("Mousely Desktop")
        self.root.geometry("460x620")
        self.root.resizable(False, False)

        # Style configuration - Dark Theme matching Mousely aesthetic
        bg_color = "#0e0e12"
        card_bg = "#181820"
        accent_color = "#3b82f6"
        text_primary = "#ffffff"
        text_secondary = "#9ca3af"

        self.root.configure(bg=bg_color)

        # Header Title
        header_frame = tk.Frame(self.root, bg=bg_color)
        header_frame.pack(fill="x", padx=24, pady=(24, 12))

        lbl_title = tk.Label(
            header_frame,
            text="Mousely Desktop",
            font=("Helvetica", 20, "bold"),
            fg=text_primary,
            bg=bg_color
        )
        lbl_title.pack(anchor="w")

        lbl_sub = tk.Label(
            header_frame,
            text="Scan the QR code with your phone or open the link below",
            font=("Helvetica", 10),
            fg=text_secondary,
            bg=bg_color
        )
        lbl_sub.pack(anchor="w", pady=(4, 0))

        # QR Code Card
        qr_card = tk.Frame(self.root, bg=card_bg, highlightbackground="#2d2d3a", highlightthickness=1)
        qr_card.pack(fill="x", padx=24, pady=12)

        # Generate QR Code image
        primary_ip = get_local_ips()[0]
        url = f"http://{primary_ip}:{self.port}"

        qr = qrcode.QRCode(
            version=1,
            box_size=6,
            border=2,
            error_correction=qrcode.constants.ERROR_CORRECT_M
        )
        qr.add_data(url)
        qr.make(fit=True)
        img = qr.make_image(fill_color="#ffffff", back_color="#181820")
        
        self.qr_photo = ImageTk.PhotoImage(img, master=self.root)

        qr_label = tk.Label(qr_card, image=self.qr_photo, bg=card_bg)
        qr_label.pack(pady=(16, 8))

        url_label = tk.Label(
            qr_card,
            text=url,
            font=("Helvetica", 12, "bold"),
            fg="#60a5fa",
            bg=card_bg,
            cursor="hand2"
        )
        url_label.pack(pady=(0, 16))
        url_label.bind("<Button-1>", lambda e: webbrowser.open(url))

        # Controls & Settings Section
        settings_card = tk.Frame(self.root, bg=card_bg, highlightbackground="#2d2d3a", highlightthickness=1)
        settings_card.pack(fill="x", padx=24, pady=12)

        tk.Label(
            settings_card,
            text="Quick Settings",
            font=("Helvetica", 11, "bold"),
            fg=text_primary,
            bg=card_bg
        ).pack(anchor="w", padx=16, pady=(12, 8))

        # Sensitivity Slider
        sens_frame = tk.Frame(settings_card, bg=card_bg)
        sens_frame.pack(fill="x", padx=16, pady=4)
        tk.Label(sens_frame, text="Pointer Speed:", font=("Helvetica", 10), fg=text_secondary, bg=card_bg).pack(side="left")
        
        self.sens_val = tk.DoubleVar(value=self.config.get("mouse_sensitivity", 1.2))
        sens_scale = tk.Scale(
            sens_frame,
            from_=0.5,
            to=3.0,
            resolution=0.1,
            orient="horizontal",
            variable=self.sens_val,
            bg=card_bg,
            fg=text_primary,
            highlightthickness=0,
            troughcolor="#2d2d3a",
            command=self._on_sens_change
        )
        sens_scale.pack(side="right", fill="x", expand=True, padx=(12, 0))

        # Status Bar
        status_frame = tk.Frame(self.root, bg=bg_color)
        status_frame.pack(side="bottom", fill="x", padx=24, pady=16)

        self.status_dot = tk.Label(status_frame, text="●", font=("Helvetica", 14), fg="#10b981", bg=bg_color)
        self.status_dot.pack(side="left", padx=(0, 6))

        self.status_text = tk.Label(
            status_frame,
            text="Receiver active and broadcasting on LAN",
            font=("Helvetica", 9),
            fg=text_secondary,
            bg=bg_color
        )
        self.status_text.pack(side="left")

        self.root.mainloop()

    def _on_sens_change(self, val):
        self.config["mouse_sensitivity"] = float(val)
        save_config(self.config)
