"""
Pure-Python /dev/uinput writer.

python-evdev opens the uinput node with O_RDWR, but udev permissions on many
distros grant only group *write* (e.g. MODE="0220"). The kernel itself only
requires write access to inject events, so this fallback opens the node
O_WRONLY and configures the virtual device with plain ioctls.

No root privileges are required at runtime: the user just needs write access
to /dev/uinput (e.g. member of the 'input' group).
"""

import fcntl
import os
import struct
import time

# ioctl request codes (see linux/uinput.h) ------------------------------------
UI_SET_EVBIT = 0x40045564      # _IOR('U', 100, int)
UI_SET_RELBIT = 0x40045566     # _IOR('U', 102, int)
UI_SET_KEYBIT = 0x40045565     # _IOR('U', 101, int)
UI_DEV_CREATE = 0x5501         # _IO('U', 101)
UI_DEV_DESTROY = 0x5502        # _IO('U', 102)

EV_SYN = 0x0000
EV_KEY = 0x0001
EV_REL = 0x0002

BUS_USB = 0x0003

# struct uinput_user_dev: name[80], input_id (4x u16), ff_effects_max, abs tables
_USER_DEV_FORMAT = "80sHHHHi" + "i" * 256

# struct input_event: timeval (tv_sec, tv_usec), type, code, value.
# timeval width differs between 32- and 64-bit platforms.
_IS_64BIT = struct.calcsize("P") == 8
_EVENT_FORMAT = "@llHHi" if _IS_64BIT else "@iiHHi"


class RawUInput:
    """Minimal virtual uinput device limited to relative movement + keys."""

    def __init__(self, name: str, rel_codes, key_codes):
        # Write-only is sufficient for injecting events; avoids the O_RDWR
        # read-permission problem python-evdev has with MODE="0220" udev rules.
        self.fd = os.open("/dev/uinput", os.O_WRONLY | os.O_NONBLOCK)

        for code in rel_codes:
            fcntl.ioctl(self.fd, UI_SET_EVBIT, EV_REL)
            fcntl.ioctl(self.fd, UI_SET_RELBIT, code)
        for code in key_codes:
            fcntl.ioctl(self.fd, UI_SET_EVBIT, EV_KEY)
            fcntl.ioctl(self.fd, UI_SET_KEYBIT, code)
        fcntl.ioctl(self.fd, UI_SET_EVBIT, EV_SYN)

        # Legacy uinput_user_dev handshake, then create the virtual node.
        user_dev = struct.pack(
            _USER_DEV_FORMAT,
            name.encode("utf-8")[:79],   # null-padded name (max 79 chars)
            BUS_USB, 0x0001, 0x0001, 0x0001,   # bustype, vendor, product, version
            0,                                    # ff_effects_max
            *([0] * 256)                          # absmax/absmin/absfuzz/absflat
        )
        os.write(self.fd, user_dev)
        fcntl.ioctl(self.fd, UI_DEV_CREATE)

        self._event_struct = struct.Struct(_EVENT_FORMAT)

    def write(self, etype: int, code: int, value: int) -> None:
        now = time.time()
        os.write(self.fd, self._event_struct.pack(
            int(now), int(now % 1.0 * 1_000_000), etype, code, value
        ))

    def syn(self) -> None:
        self.write(EV_SYN, 0, 0)           # SYN_REPORT

    def close(self) -> None:
        try:
            fcntl.ioctl(self.fd, UI_DEV_DESTROY)
        finally:
            os.close(self.fd)
