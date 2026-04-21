import os
import shutil

from security.db import init_db
from ui.state_helper import app_path, ensure_state_file, resource_path


DEFAULT_CONFIG = """module.exports = {
  "browser": {
    "headless": false,
    "slowMo": 100,
    "args": [
      "--start-maximized",
      "--disable-blink-features=AutomationControlled"
    ]
  },
  "utils": {
    "base": "https://forest.mponline.gov.in/"
  },
  "timeouts": {
    "pageLoad": 58000
  },
  "features": {
    "autoRetry": true
  }
};
"""

DEFAULT_CSV_HEADERS = "name,age,gender,guardian,nationality,idType,idNumber\n"


def _seed_runtime_file(relative_parts, default_text):
    runtime_path = app_path(*relative_parts)
    bundled_path = resource_path(*relative_parts)
    os.makedirs(os.path.dirname(runtime_path), exist_ok=True)

    runtime_missing = not os.path.exists(runtime_path)
    runtime_is_stub = False
    if not runtime_missing:
        try:
            with open(runtime_path, "r", encoding="utf-8", newline="") as f:
                runtime_is_stub = f.read().strip() == default_text.strip()
        except OSError:
            runtime_is_stub = False

    bundled_has_data = False
    if os.path.exists(bundled_path):
        try:
            with open(bundled_path, "r", encoding="utf-8", newline="") as f:
                bundled_has_data = f.read().strip() != default_text.strip()
        except OSError:
            bundled_has_data = False

    # In frozen builds the writable runtime folder lives next to the executable.
    # Seed it from the bundled file when the runtime copy is missing or still
    # just the bootstrap stub that contains headers only.
    if os.path.exists(bundled_path) and bundled_has_data and (runtime_missing or runtime_is_stub):
        shutil.copyfile(bundled_path, runtime_path)
        return runtime_path

    if runtime_missing:
        with open(runtime_path, "w", encoding="utf-8", newline="") as f:
            f.write(default_text)

    return runtime_path


def ensure_runtime_files():
    os.makedirs(app_path("config"), exist_ok=True)
    os.makedirs(app_path("logs"), exist_ok=True)
    os.makedirs(app_path("src", "data"), exist_ok=True)

    config_path = app_path("src", "config", "app.config.js")
    os.makedirs(os.path.dirname(config_path), exist_ok=True)
    if not os.path.exists(config_path):
        with open(config_path, "w", encoding="utf-8") as f:
            f.write(DEFAULT_CONFIG)

    _seed_runtime_file(("src", "data", "singleTourist.csv"), DEFAULT_CSV_HEADERS)
    _seed_runtime_file(("src", "data", "tourists.csv"), DEFAULT_CSV_HEADERS)

    ensure_state_file()
    init_db()
