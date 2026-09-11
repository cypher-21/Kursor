#!/usr/bin/env python3
"""
Kursor Desktop Server (Windows & Linux)
Universal Wireless Trackpad & Presentation Receiver
"""

import sys
import os
import argparse
import asyncio
import threading
import qrcode
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from kursor.server import KursorServer
from kursor.discovery import get_local_ips
from kursor.config import load_config

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

def print_terminal_qr(url: str):
    """Prints an ASCII QR code directly to the terminal."""
    qr = qrcode.QRCode(border=1)
    qr.add_data(url)
    qr.make(fit=True)
    print("\n  Scan with phone camera to connect:")
    print("  " + "-" * 42)
    try:
        qr.print_ascii(invert=True)
    except Exception:
        print(f"  Connect URL: {url}")
    print("  " + "-" * 42)

def main():
    parser = argparse.ArgumentParser(description="Kursor Desktop Server")
    parser.add_argument("--port", type=int, default=8765, help="Port to listen on (default: 8765)")
    parser.add_argument("--cli", action="store_true", help="Run headless in terminal mode (no GUI)")
    parser.add_argument("--gui", action="store_true", help="Force GUI pairing window")
    parser.add_argument("--static", type=str, default=None, help="Path to static web assets directory")
    args = parser.parse_args()

    ips = get_local_ips()
    primary_ip = ips[0]
    pairing_url = f"http://{primary_ip}:{args.port}"

    print(r"""
  _  ___   _ ____  ____   ___  ____  
 | |/ / | | |  _ \/ ___| / _ \|  _ \ 
 | ' /| | | | |_) \___ \| | | | |_) |
 | . \| |_| |  _ < ___) | |_| |  _ < 
 |_|\_\\___/|_| \_\____/ \___/|_| \_\ 
    """)
    print(f"  * Status       : Listening on port {args.port}")
    print(f"  * Network URL  : {pairing_url}")
    print(f"  * Host IP list : {', '.join(ips)}")

    # Print ASCII QR code in terminal
    try:
        print_terminal_qr(pairing_url)
    except Exception:
        pass

    # Determine whether to run GUI
    has_display = bool(os.environ.get("DISPLAY") or os.environ.get("WAYLAND_DISPLAY") or sys.platform == "win32")
    start_gui = (args.gui or (has_display and not args.cli))

    server = KursorServer(port=args.port, static_dir=args.static)

    if start_gui:
        try:
            from kursor.gui import KursorGUI
            gui_app = KursorGUI(port=args.port, server=server)

            # Run server in asyncio background thread
            def run_server():
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                loop.run_until_complete(server.start())
                loop.run_forever()

            t = threading.Thread(target=run_server, daemon=True)
            t.start()

            # Run GUI on main thread
            gui_app.start()
            return
        except Exception as e:
            print(f"[Kursor] GUI closed or skipped: {e}. Running in CLI mode.")

    # Headless CLI loop
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(server.start())
    try:
        loop.run_forever()
    except KeyboardInterrupt:
        print("\n[Kursor] Server shutting down cleanly...")

if __name__ == "__main__":
    main()
