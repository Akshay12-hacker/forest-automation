import json
import os
import sys

# ⭐ SAFE PATH FOR DEV + EXE
def app_path(*parts):
    if getattr(sys, "frozen", False):
        base = os.path.dirname(sys.executable)
    else:
        base = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    return os.path.join(base, *parts)

STATE_FILE = app_path("config", "state.json")

DEFAULT_STATE = {
    "paused": False,
    "stop": False,
    "resume_phase": None
}


def ensure_state_file():
    os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)

    if not os.path.exists(STATE_FILE):
        with open(STATE_FILE, "w") as f:
            json.dump(DEFAULT_STATE, f, indent=2)


def set_state(**kwargs):
    ensure_state_file()

    try:
        with open(STATE_FILE, "r") as f:
            state = json.load(f)
    except:
        state = DEFAULT_STATE.copy()

    state.update(kwargs)

    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)


def get_state():
    ensure_state_file()

    try:
        with open(STATE_FILE, "r") as f:
            return json.load(f)
    except:
        return DEFAULT_STATE.copy()
