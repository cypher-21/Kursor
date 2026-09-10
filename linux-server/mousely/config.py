import os
import json
from pathlib import Path

DEFAULT_CONFIG = {
    "port": 8765,
    "udp_discovery_port": 8766,
    "mouse_sensitivity": 1.2,
    "mouse_acceleration": 1.15,
    "scroll_sensitivity": 1.0,
    "invert_scroll": False,
    "preferred_backend": "auto",  # 'auto', 'uinput', 'ydotool', 'x11', 'pynput'
    "laser_color": "#ff2a5f",
    "laser_size": 18,
    "spotlight_radius": 120,
    "pin_required": False,
    "pin": "",
    "name": "Mousely Linux"
}

def get_config_dir() -> Path:
    config_home = os.environ.get("XDG_CONFIG_HOME", os.path.expanduser("~/.config"))
    path = Path(config_home) / "mousely"
    path.mkdir(parents=True, exist_ok=True)
    return path

def load_config() -> dict:
    config_file = get_config_dir() / "config.json"
    cfg = DEFAULT_CONFIG.copy()
    if config_file.exists():
        try:
            with open(config_file, "r", encoding="utf-8") as f:
                user_cfg = json.load(f)
                cfg.update(user_cfg)
        except Exception as e:
            print(f"[Config] Error loading config, using defaults: {e}")
    return cfg

def save_config(cfg: dict) -> None:
    config_file = get_config_dir() / "config.json"
    try:
        with open(config_file, "w", encoding="utf-8") as f:
            json.dump(cfg, f, indent=2)
    except Exception as e:
        print(f"[Config] Error saving config: {e}")
