import json
import os

STATE_FILE = os.path.join(
    os.path.dirname(__file__),
    "..",
    "config",
    "state.json"
)

DEFAULT_STATE = {
    "paused": False,
    "stop": False,
    "resume_phase": None
}

def set_state(**kwargs):
    state = DEFAULT_STATE.copy()

    if os.path.exists(STATE_FILE):
        with open(STATE_FILE, "r") as f:
            state.update(json.load(f))

    state.update(kwargs)

    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)

def get_state():
    if not os.path.exists(STATE_FILE):
        return DEFAULT_STATE.copy()

    with open(STATE_FILE, "r") as f:
        return json.load(f)
