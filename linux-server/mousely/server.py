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
from .laser_overlay import LaserOverlay
from .discovery import DiscoveryService, get_local_ips

class MouselyServer:
    def __init__(self, port: int = 8765, static_dir: str = None):
        self.config = load_config()
        self.port = port or self.config.get("port", 8765)
        self.app = web.Application()
        self.connected_sockets: Set[web.WebSocketResponse] = set()
        
        # Core engines
        self.input_engine = create_input_backend(self.config.get("preferred_backend", "auto"))
        self.sys_controls = SystemControls()
        self.laser_overlay = LaserOverlay(
            color=self.config.get("laser_color", "#ff2a5f"),
            dot_size=self.config.get("laser_size", 18),
            spotlight_radius=self.config.get("spotlight_radius", 120)
        )
        self.laser_overlay.start()

        self.discovery = DiscoveryService(
            http_port=self.port,
            discovery_port=self.config.get("udp_discovery_port", 8766),
            server_name=self.config.get("name", "Mousely Linux")
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
        return web.Response(text="Mousely Web Remote not built yet. Run 'npm run build' in android/.", content_type="text/html")

    async def handle_fallback(self, request: web.Request) -> web.Response:
        file_path = self.static_dir / request.match_info["tail"]
        if file_path.is_file():
            return web.FileResponse(file_path)
        return await self.handle_index(request)

    async def handle_info(self, request: web.Request) -> web.Response:
        data = {
            "name": self.config.get("name", "Mousely Linux"),
            "os": sys.platform,
            "version": "1.0.0",
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
        print(f"[Mousely] Remote device connected from {client_ip}. (Active: {len(self.connected_sockets)})")

        # Send welcome & initial status
        await ws.send_json({
            "type": "init",
            "server_name": self.config.get("name", "Mousely Linux"),
            "status": self.sys_controls.get_system_status(),
            "settings": {
                "sensitivity": self.config.get("mouse_sensitivity", 1.2),
                "invert_scroll": self.config.get("invert_scroll", False)
            }
        })

        sens = self.config.get("mouse_sensitivity", 1.2)
        accel = self.config.get("mouse_acceleration", 1.15)
        scroll_sens = self.config.get("scroll_sensitivity", 1.0)
        invert_scroll = -1.0 if self.config.get("invert_scroll", False) else 1.0

        try:
            async for msg in ws:
                if msg.type == aiohttp.WSMsgType.TEXT:
                    try:
                        data = json.loads(msg.data)
                        msg_type = data.get("type")

                        if msg_type == "move":
                            raw_dx = float(data.get("dx", 0))
                            raw_dy = float(data.get("dy", 0))
                            # Apply acceleration curve: small movements precise, fast movements swift
                            dist = (raw_dx**2 + raw_dy**2)**0.5
                            factor = (1.0 + (dist * 0.05 * (accel - 1.0))) * sens
                            self.input_engine.move(raw_dx * factor, raw_dy * factor)

                        elif msg_type == "click":
                            button = data.get("button", "left")
                            state = data.get("state", "click")
                            self.input_engine.click(button, state)

                        elif msg_type == "scroll":
                            sdx = float(data.get("dx", 0)) * scroll_sens
                            sdy = float(data.get("dy", 0)) * scroll_sens * invert_scroll
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
                            elif action == "black":
                                self.input_engine.press_key("b")
                            elif action == "white":
                                self.input_engine.press_key("w")

                        elif msg_type == "laser":
                            active = bool(data.get("active", False))
                            x = data.get("x")
                            y = data.get("y")
                            mode = data.get("mode", "laser")
                            self.laser_overlay.update_pointer(active, x, y, mode)

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

                        elif msg_type == "dnd":
                            dnd_state = self.sys_controls.toggle_dnd()
                            await ws.send_json({"type": "dnd_state", "active": dnd_state})

                        elif msg_type == "text":
                            self.input_engine.type_text(data.get("content", ""))

                        elif msg_type == "key":
                            self.input_engine.press_key(data.get("key", ""))

                        elif msg_type == "ping":
                            # Ping-pong for live latency calculation
                            await ws.send_json({"type": "pong", "t": data.get("t")})

                    except Exception as err:
                        print(f"[Mousely] Error handling client packet: {err}")

                elif msg.type == aiohttp.WSMsgType.ERROR:
                    print(f"[Mousely] WebSocket error: {ws.exception()}")

        finally:
            self.connected_sockets.remove(ws)
            print(f"[Mousely] Remote device disconnected. (Active: {len(self.connected_sockets)})")

        return ws

    async def start(self):
        await self.discovery.start()
        runner = web.AppRunner(self.app)
        await runner.setup()
        site = web.TCPSite(runner, "0.0.0.0", self.port)
        await site.start()
        print(f"[Mousely] Server listening on http://0.0.0.0:{self.port}")
