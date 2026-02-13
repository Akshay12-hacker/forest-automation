import json
import os

STATE_FILE = os.path.join("src", "control", "state.json")

def set_state(**kwargs):
    with open(STATE_FILE, "r") as f:
        data = json.load(f)

    for k, v in kwargs.items():
        data[k] = v

    with open(STATE_FILE, "w") as f:
        json.dump(data, f, indent=2)

def set_resume_phase(phase):
    set_state(resume_phase=phase)
