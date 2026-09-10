import socket
import json
import asyncio
import os
from typing import List

def get_local_ips() -> List[str]:
    """Retrieve all non-loopback IPv4 addresses of this machine."""
    ips = []
    try:
        # Standard approach
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.1)
        # Connect to public DNS (does not actually send packets)
        s.connect(("8.8.8.8", 80))
        primary_ip = s.getsockname()[0]
        s.close()
        if primary_ip and primary_ip != "127.0.0.1":
            ips.append(primary_ip)
    except Exception:
        pass

    try:
        hostname = socket.gethostname()
        for info in socket.getaddrinfo(hostname, None):
            ip = info[4][0]
            if ":" not in ip and ip != "127.0.0.1" and ip not in ips:
                ips.append(ip)
    except Exception:
        pass

    if not ips:
        ips.append("127.0.0.1")
    return ips

class DiscoveryService:
    """
    UDP Broadcast Beacon & Responder.
    Allows Android client to automatically discover the Linux PC on the local Wi-Fi.
    """

    def __init__(self, http_port: int = 8765, discovery_port: int = 8766, server_name: str = "Mousely Linux"):
        self.http_port = http_port
        self.discovery_port = discovery_port
        self.server_name = server_name
        self.running = False
        self._sock = None

    async def start(self):
        self.running = True
        try:
            self._sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            self._sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
            self._sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            self._sock.setblocking(False)
            self._sock.bind(("", self.discovery_port))
        except Exception as e:
            print(f"[Discovery] Could not bind UDP port {self.discovery_port}: {e}")
            return

        asyncio.create_task(self._beacon_loop())
        asyncio.create_task(self._listen_loop())

    async def _beacon_loop(self):
        """Periodically broadcast presence on the LAN."""
        loop = asyncio.get_running_loop()
        hostname = socket.gethostname()

        while self.running:
            ips = get_local_ips()
            payload = json.dumps({
                "service": "mousely",
                "name": self.server_name,
                "hostname": hostname,
                "ips": ips,
                "port": self.http_port,
                "os": "linux",
                "version": "1.0.0"
            }).encode("utf-8")

            try:
                # Broadcast to generic 255.255.255.255
                await loop.sock_sendto(self._sock, payload, ("255.255.255.255", self.discovery_port))
            except Exception:
                pass

            await asyncio.sleep(2.5)

    async def _listen_loop(self):
        """Respond to direct discovery queries from clients."""
        loop = asyncio.get_running_loop()
        hostname = socket.gethostname()

        while self.running:
            try:
                data, addr = await loop.sock_recvfrom(self._sock, 1024)
                try:
                    msg = json.loads(data.decode("utf-8"))
                    if msg.get("query") == "mousely_discover":
                        reply = json.dumps({
                            "service": "mousely",
                            "name": self.server_name,
                            "hostname": hostname,
                            "ips": get_local_ips(),
                            "port": self.http_port,
                            "os": "linux"
                        }).encode("utf-8")
                        await loop.sock_sendto(self._sock, reply, addr)
                except Exception:
                    pass
            except Exception:
                await asyncio.sleep(0.5)

    def stop(self):
        self.running = False
        if self._sock:
            self._sock.close()
