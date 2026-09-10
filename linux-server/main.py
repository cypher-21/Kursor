#!/usr/bin/env python3
"""
Mousely for Linux - Universal Receiver & Daemon
Usage:
    python main.py             # Start server with GUI if display available
    python main.py --cli       # Run headless daemon in terminal
    python main.py --port 8765 # Custom port
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

from mousely.server import MouselyServer
from mousely.discovery import get_local_ips
from mousely.config import load_config

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
    print("\n  Scan with your phone camera to connect:")
    print("  " + "-" * 40)
    try:
        qr.print_ascii(invert=True)
    except Exception:
        print(f"  Connect URL: {url}")
    print("  " + "-" * 40)

def main():
    parser = argparse.ArgumentParser(description="Mousely Linux Server")
    parser.add_argument("--port", type=int, default=8765, help="HTTP/WebSocket port (default: 8765)")
    parser.add_argument("--cli", action="store_true", help="Run in headless terminal mode (no GUI)")
    parser.add_argument("--gui", action="store_true", help="Force GUI window")
    parser.add_argument("--static", type=str, default=None, help="Path to static web assets directory")
    args = parser.parse_args()

    ips = get_local_ips()
    primary_ip = ips[0]
    pairing_url = f"http://{primary_ip}:{args.port}"

    print(r"""
  __  __                       _       
 |  \/  | ___  _   _ ___  ___ | |_   _ 
 | |\/| |/ _ \| | | / __|/ _ \| | | | |
 | |  | | (_) | |_| \__ \  __/| | |_| |
 |_|  |_|\___/ \__,_|___/\___||_|\__, |
                                  |___/  (Linux Edition)
    """)
    print(f"  * Receiver Status : Listening on port {args.port}")
    print(f"  * Local Web Link  : {pairing_url}")
    print(f"  * All Host IPs    : {', '.join(ips)}")

    # Print ASCII QR code in terminal
    try:
        print_terminal_qr(pairing_url)
    except Exception:
        pass

    # Determine whether to run GUI
    has_display = bool(os.environ.get("DISPLAY") or os.environ.get("WAYLAND_DISPLAY") or sys.platform == "win32")
    start_gui = (args.gui or (has_display and not args.cli))

    if start_gui:
        try:
            from mousely.gui import MouselyGUI
            gui_app = MouselyGUI(port=args.port)

            # Run server in asyncio background thread
            def run_server():
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                server = MouselyServer(port=args.port, static_dir=args.static)
                loop.run_until_complete(server.start())
                loop.run_forever()

            t = threading.Thread(target=run_server, daemon=True)
            t.start()

            # Run GUI on main thread
            gui_app.start()
            return
        except Exception as e:
            print(f"[Mousely] GUI closed or skipped: {e}. Running in CLI mode.")

    # Headless CLI loop
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    server = MouselyServer(port=args.port, static_dir=args.static)
    loop.run_until_complete(server.start())
    try:
        loop.run_forever()
    except KeyboardInterrupt:
        print("\n[Mousely] Server shutting down cleanly...")

if __name__ == "__main__":
    main()
