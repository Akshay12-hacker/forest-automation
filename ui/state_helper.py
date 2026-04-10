import json
import os
import sys
import hmac
import hashlib
import tempfile
from datetime import datetime

# ⭐ SAFE PATH FOR DEV + EXE
def app_path(*parts):
    if getattr(sys, "frozen", False):
        base = os.path.dirname(sys.executable)
    else:
        base = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    return os.path.join(base, *parts)

STATE_FILE = app_path("config", "state.json")
AUDIT_LOG_FILE = app_path("logs", "security_audit.log")

DEFAULT_STATE = {
    "paused": False,
    "stop": False,
    "resume_phase": None
}
ALLOWED_RESUME_PHASES = {None, "PHASE_7", "PHASE_8_FULL", "PHASE_8_SINGLE"}
STATE_SECRET = os.environ.get("FOREST_STATE_SECRET", "forest_state_dev_secret")
DEFAULT_SECRET_IN_USE = (STATE_SECRET == "forest_state_dev_secret")
_default_secret_warned = False


def _audit(event: str, detail: str):
    try:
        os.makedirs(os.path.dirname(AUDIT_LOG_FILE), exist_ok=True)
        line = f"[{datetime.utcnow().isoformat()}Z] {event}: {detail}\n"
        with open(AUDIT_LOG_FILE, "a", encoding="utf-8") as f:
            f.write(line)
    except Exception:
        # Never break runtime due to audit logging issues.
        pass


def ensure_state_file():
    global _default_secret_warned
    os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)

    if DEFAULT_SECRET_IN_USE and not _default_secret_warned:
        _audit(
            "STATE_SECRET_DEFAULT",
            "FOREST_STATE_SECRET is not set; using default development secret.",
        )
        _default_secret_warned = True

    if not os.path.exists(STATE_FILE):
        _write_state(DEFAULT_STATE.copy())

    if not os.access(STATE_FILE, os.R_OK | os.W_OK):
        _audit("STATE_FILE_ACCESS", f"State file not readable/writable: {STATE_FILE}")


def _state_payload(state: dict) -> str:
    core = {
        "paused": bool(state.get("paused", False)),
        "stop": bool(state.get("stop", False)),
        "resume_phase": state.get("resume_phase"),
    }
    return json.dumps(core, sort_keys=True, separators=(",", ":"))


def _sign_state(state: dict) -> str:
    payload = _state_payload(state)
    return hmac.new(
        STATE_SECRET.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()


def _sanitize_state(state: dict) -> dict:
    resume_phase = state.get("resume_phase")
    if resume_phase not in ALLOWED_RESUME_PHASES:
        resume_phase = None
    return {
        "paused": bool(state.get("paused", False)),
        "stop": bool(state.get("stop", False)),
        "resume_phase": resume_phase,
    }


def _write_state(state: dict):
    safe_state = _sanitize_state(state)
    data = {**safe_state, "signature": _sign_state(safe_state)}

    directory = os.path.dirname(STATE_FILE)
    fd, tmp_path = tempfile.mkstemp(prefix="state_", suffix=".json", dir=directory)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        os.replace(tmp_path, STATE_FILE)
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


def set_state(**kwargs):
    ensure_state_file()

    try:
        with open(STATE_FILE, "r", encoding="utf-8") as f:
            state = json.load(f)
    except Exception:
        state = DEFAULT_STATE.copy()

    safe_state = _sanitize_state(state)
    safe_state.update(kwargs)
    _write_state(safe_state)


def get_state():
    ensure_state_file()

    try:
        with open(STATE_FILE, "r", encoding="utf-8") as f:
            state = json.load(f)
    except Exception:
        _audit("STATE_READ_ERROR", "Failed to read/parse state file; using safe default.")
        return DEFAULT_STATE.copy()

    signature = state.get("signature")
    safe_state = _sanitize_state(state)
    expected = _sign_state(safe_state)
    if not isinstance(signature, str) or not hmac.compare_digest(signature, expected):
        _audit("STATE_TAMPER_DETECTED", "Invalid or missing state signature.")
        return DEFAULT_STATE.copy()
    return safe_state
