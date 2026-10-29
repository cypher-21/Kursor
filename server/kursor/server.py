import asyncio
import json
import os
import sys
import time
from pathlib import Path
from typing import Set, Dict, Any

from aiohttp import web
import aiohttp

from .config import load_config
from .input_engine import create_input_backend
from .system_controls import SystemControls
from .discovery import DiscoveryService, get_local_ips
from . import __version__


# --------------------------------------------------------------------------
# HTTP caching middleware - ROOT FIX for the "stale PWA UI" trap.
#
# The old behavior served index.html / sw.js with no Cache-Control at all, so
# browsers were free to heuristic-cache the app shell. Combined with an older
# service worker this left phones showing an outdated UI that never
# revalidated. Policy:
#   * /sw.js            -> no-cache  (the SW script must ALWAYS be revalidated)
#   * app shell (.html, /, manifest.json, icons) -> no-cache (revalidate, small)
#   * /assets/*         -> immutable (hashed build output, cache forever)
# --------------------------------------------------------------------------
@web.middleware
async def cache_headers_middleware(request: web.Request, handler):
    p = request.path
    if p == "/ws" or p.startswith("/api/"):
        return await handler(request)
    resp = await handler(request)
    if p == "/sw.js":
        resp.headers["Cache-Control"] = "no-cache"
    elif p.startswith("/assets/"):
        resp.headers["Cache-Control"] = "public, max-age=31536000, immutable"
    else:
        # app shell pages + manifest + icons: revalidate every time (cheap 304s)
        resp.headers["Cache-Control"] = "no-cache"
    return resp


class KursorServer:
    def __init__(self, port: int = 8765, static_dir: str = None):
        self.config = load_config()
        self.port = port or self.config.get("port", 8765)
        self.app = web.Application(middlewares=[cache_headers_middleware])
        self.connected_sockets: Set[web.WebSocketResponse] = set()

        # Dynamic sensitivity controls
        self.mouse_sensitivity = float(self.config.get("mouse_sensitivity", 1.2))
        self.mouse_acceleration = float(self.config.get("mouse_acceleration", 1.15))
        self.scroll_sensitivity = float(self.config.get("scroll_sensitivity", 1.0))
        self.invert_scroll = bool(self.config.get("invert_scroll", False))
        
        # Core engines
        self.input_engine = create_input_backend(self.config.get("preferred_backend", "auto"))
        self.sys_controls = SystemControls(input_backend=self.input_engine)

        default_name = f"Kursor ({'Windows' if sys.platform == 'win32' else 'Linux'})"
        self.server_name = self.config.get("name", default_name)

        self.discovery = DiscoveryService(
            http_port=self.port,
            discovery_port=self.config.get("udp_discovery_port", 8766),
            server_name=self.server_name
        )

        # Static assets directory (for the web app)
        if static_dir and Path(static_dir).exists():
            self.static_dir = Path(static_dir)
        else:
            # Fallback path relative to project
            dev_android_dist = Path(__file__).resolve().parent.parent.parent / "android" / "dist"
            if dev_android_dist.exists():
                self.static_dir = dev_android_dist
            else:
                self.static_dir = Path(__file__).resolve().parent / "static"
                self.static_dir.mkdir(parents=True, exist_ok=True)

        self._setup_routes()

    def set_mouse_sensitivity(self, val: float):
        self.mouse_sensitivity = float(val)
        self.config["mouse_sensitivity"] = float(val)

    def set_scroll_sensitivity(self, val: float):
        self.scroll_sensitivity = float(val)
        self.config["scroll_sensitivity"] = float(val)

    def _setup_routes(self):
        self.app.router.add_get("/ws", self.handle_websocket)
        self.app.router.add_get("/api/info", self.handle_info)
        self.app.router.add_get("/api/status", self.handle_status)

        # Serve static web remote
        if self.static_dir.exists():
            self.app.router.add_static("/assets", self.static_dir / "assets", show_index=False)
            self.app.router.add_get("/", self.handle_index)
            self.app.router.add_get("/{tail:.*}", self.handle_fallback)

    async def handle_index(self, request: web.Request) -> web.Response:
        index_file = self.static_dir / "index.html"
        if index_file.exists():
            return web.FileResponse(index_file)
        return web.Response(text="Kursor Web Remote not built yet. Run 'npm run build' in android/.", content_type="text/html")

    async def handle_fallback(self, request: web.Request) -> web.Response:
        file_path = self.static_dir / request.match_info["tail"]
        if file_path.is_file():
            return web.FileResponse(file_path)
        return await self.handle_index(request)

    def _status_payload(self) -> dict:
        return {"type": "status", "status": self.sys_controls.get_system_status()}

    async def broadcast_status(self, exclude=None):
        """Push fresh system state (volume/media/dnd/battery) to every connected remote."""
        payload = self._status_payload()
        dead = []
        for ws in list(self.connected_sockets):
            if ws is exclude:
                continue
            try:
                await ws.send_json(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.connected_sockets.discard(ws)

    async def handle_info(self, request: web.Request) -> web.Response:
        data = {
            "name": self.server_name,
            "os": sys.platform,
            "version": __version__,
            "ips": get_local_ips(),
            "port": self.port,
            "connected_clients": len(self.connected_sockets)
        }
        return web.json_response(data, headers={"Access-Control-Allow-Origin": "*"})

    async def handle_status(self, request: web.Request) -> web.Response:
        status = self.sys_controls.get_system_status()
        return web.json_response(status, headers={"Access-Control-Allow-Origin": "*"})

    async def handle_websocket(self, request: web.Request) -> web.WebSocketResponse:
        ws = web.WebSocketResponse(heartbeat=15.0)
        await ws.prepare(request)

        self.connected_sockets.add(ws)
        client_ip = request.remote
        print(f"[Kursor] Remote device connected from {client_ip}. (Active: {len(self.connected_sockets)})")

        # Optional PIN pairing: when enabled, every client must authenticate
        # as its first message before the server accepts any input commands.
        auth_required = bool(self.config.get("pin_required", False))
        if auth_required and not str(self.config.get("pin", "") or "").strip():
            auth_required = False  # misconfigured (required but empty) -> do not lock everyone out

        welcome = {
            "type": "init",
            "server_name": self.server_name,
            "protocol": 2,
            "auth_required": auth_required,
            "settings": {
                "sensitivity": self.mouse_sensitivity,
                "scroll_sensitivity": self.scroll_sensitivity,
                "invert_scroll": self.invert_scroll
            }
        }
        if not auth_required:
            welcome["status"] = self.sys_controls.get_system_status()
        await ws.send_json(welcome)

        authenticated = not auth_required
        auth_attempts = 0
        max_auth_attempts = 5

        try:
            async for msg in ws:
                if msg.type == aiohttp.WSMsgType.TEXT:
                    try:
                        data = json.loads(msg.data)
                        msg_type = data.get("type")

                        # ---- PIN gate: block everything except auth / ping ----
                        if not authenticated:
                            if msg_type == "auth":
                                offered = str(data.get("pin", "") or "").strip()
                                expected = str(self.config.get("pin", "") or "").strip()
                                if offered == expected:
                                    authenticated = True
                                    print(f"[Kursor] Client {client_ip} authenticated successfully.")
                                    await ws.send_json({
                                        "type": "auth_ok",
                                        "server_name": self.server_name,
                                        "status": self.sys_controls.get_system_status(),
                                        "settings": {
                                            "sensitivity": self.mouse_sensitivity,
                                            "scroll_sensitivity": self.scroll_sensitivity,
                                            "invert_scroll": self.invert_scroll
                                        }
                                    })
                                else:
                                    auth_attempts += 1
                                    print(f"[Kursor] Failed PIN attempt {auth_attempts} from {client_ip}")
                                    if auth_attempts >= max_auth_attempts:
                                        await ws.send_json({"type": "auth_denied", "message": "Too many failed attempts."})
                                        await ws.close(code=aiohttp.WSCloseCode.POLICY_VIOLATION, message=b"Too many failed PIN attempts")
                                        break
                                    await ws.send_json({
                                        "type": "auth_error",
                                        "attempts_remaining": max_auth_attempts - auth_attempts
                                    })
                            elif msg_type == "ping":
                                await ws.send_json({"type": "pong", "t": data.get("t")})
                            else:
                                await ws.send_json({"type": "auth_required"})
                            continue

                        if msg_type == "move":
                            raw_dx = float(data.get("dx", 0))
                            raw_dy = float(data.get("dy", 0))
                            sens = self.mouse_sensitivity
                            accel = self.mouse_acceleration
                            # Apply acceleration curve: small movements precise, fast movements swift
                            dist = (raw_dx**2 + raw_dy**2)**0.5
                            factor = (1.0 + (dist * 0.05 * (accel - 1.0))) * sens
                            self.input_engine.move(raw_dx * factor, raw_dy * factor)

                        elif msg_type == "click":
                            button = data.get("button", "left")
                            state = data.get("state", "click")
                            self.input_engine.click(button, state)

                        elif msg_type == "scroll":
                            scroll_sens = self.scroll_sensitivity
                            sdx = float(data.get("dx", 0)) * scroll_sens
                            sdy = float(data.get("dy", 0)) * scroll_sens
                            self.input_engine.scroll(sdx, sdy)

                        elif msg_type == "gesture":
                            action = data.get("action")
                            self.input_engine.gesture(action)

                        elif msg_type == "presenter":
                            action = data.get("action")
                            if action == "next":
                                self.input_engine.press_key("page_down")
                            elif action == "prev":
                                self.input_engine.press_key("page_up")
                            elif action == "start":
                                self.input_engine.press_key("f5")
                            elif action == "exit":
                                self.input_engine.press_key("escape")

                        elif msg_type == "power":
                            # Guarded by a confirm step on the client side
                            act = data.get("action")
                            if act == "lock":
                                self.sys_controls.lock_screen()
                            elif act == "sleep":
                                self.sys_controls.sleep()

                        elif msg_type == "clipboard":
                            # Reply only to the requesting client
                            act = data.get("action")
                            if act == "get":
                                text = self.sys_controls.get_clipboard_text()
                                await ws.send_json({
                                    "type": "clipboard_text",
                                    "text": text,
                                })

                        elif msg_type == "media":
                            action = data.get("action")
                            if action == "vol_up":
                                self.sys_controls.volume_up()
                            elif action == "vol_down":
                                self.sys_controls.volume_down()
                            elif action == "mute":
                                self.sys_controls.volume_mute_toggle()
                            elif action == "set_vol":
                                self.sys_controls.set_volume(int(data.get("value", 50)))
                            elif action == "play_pause":
                                self.sys_controls.media_play_pause()
                            elif action == "next":
                                self.sys_controls.media_next()
                            elif action == "prev":
                                self.sys_controls.media_prev()
                            # Push fresh system state to all clients (incl. sender)
                            await self.broadcast_status()

                        elif msg_type == "dnd":
                            dnd_state = self.sys_controls.toggle_dnd()
                            await ws.send_json({"type": "dnd_state", "active": dnd_state})
                            await self.broadcast_status(exclude=ws)

                        elif msg_type == "text":
                            self.input_engine.type_text(data.get("content", ""))

                        elif msg_type == "live_input":
                            char = data.get("char", "")
                            if char:
                                self.input_engine.type_text(char)

                        elif msg_type == "live_backspace":
                            self.input_engine.press_key("backspace")

                        elif msg_type == "live_enter":
                            self.input_engine.press_key("enter")

                        elif msg_type == "key":
                            self.input_engine.press_key(data.get("key", ""))

                        elif msg_type == "ping":
                            # Ping-pong for live latency calculation
                            await ws.send_json({"type": "pong", "t": data.get("t")})

                    except Exception as err:
                        import traceback
                        traceback.print_exc()
                        print(f"[Kursor] Error handling client packet: {err}")

                elif msg.type == aiohttp.WSMsgType.ERROR:
                    print(f"[Kursor] WebSocket error: {ws.exception()}")

        finally:
            self.connected_sockets.remove(ws)
            print(f"[Kursor] Remote device disconnected. (Active: {len(self.connected_sockets)})")

        return ws

    async def start(self):
        await self.discovery.start()
        runner = web.AppRunner(self.app)
        await runner.setup()
        site = web.TCPSite(runner, "0.0.0.0", self.port)
        await site.start()
        print(f"[Kursor] Server listening on http://0.0.0.0:{self.port}")

# Backward compatibility
MouselyServer = KursorServer
