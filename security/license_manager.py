import json
import hashlib
import base64
import time
import os
import urllib.error
import urllib.request
from security.machine_lock import get_machine_id
import hmac

SECRET = os.environ.get("FOREST_LICENSE_SECRET", "FOREST_AUTOMATION_PRIVATE_KEY")
DEFAULT_SECRET_IN_USE = SECRET == "FOREST_AUTOMATION_PRIVATE_KEY"
ONLINE_GRACE_SECONDS = int(os.environ.get("FOREST_LICENSE_GRACE_SECONDS", "86400"))


def _app_base_path():
    import sys
    if getattr(sys, "frozen", False):
        return os.path.dirname(sys.executable)
    return os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


LICENSE_STATUS_FILE = os.path.join(_app_base_path(), "config", "license_status.json")


def _canonical_json(data):
    return json.dumps(data, sort_keys=True, separators=(",", ":"))


def _read_online_cache():
    try:
        with open(LICENSE_STATUS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def _write_online_cache(data):
    try:
        os.makedirs(os.path.dirname(LICENSE_STATUS_FILE), exist_ok=True)
        with open(LICENSE_STATUS_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception:
        pass

def generate_license(machine_id, days=365):
    expiry = int(time.time()) + days * 86400

    payload = {
        "machine": machine_id,
        "expiry": expiry
    }

    payload_str = _canonical_json(payload)

    signature = hmac.new(
        SECRET.encode(),
        payload_str.encode(),
        hashlib.sha256
    ).hexdigest()

    license_data = {
        "payload": payload,
        "signature": signature
    }

    return base64.b64encode(
        json.dumps(license_data).encode()
    ).decode()

def verify_license(license_key):
    server_url = os.environ.get("FOREST_LICENSE_SERVER_URL")
    if server_url:
        return verify_online_license(license_key, server_url)

    return verify_local_license(license_key)


def verify_local_license(license_key):
    try:
        decoded = base64.b64decode(license_key).decode()
        data = json.loads(decoded)

        payload = data["payload"]
        signature = data["signature"]

        expected = hmac.new(
            SECRET.encode(),
            _canonical_json(payload).encode(),
            hashlib.sha256
        ).hexdigest()
        legacy_expected = hmac.new(
            SECRET.encode(),
            json.dumps(payload).encode(),
            hashlib.sha256
        ).hexdigest()

        if not (
            hmac.compare_digest(expected, signature) or
            hmac.compare_digest(legacy_expected, signature)
        ):
            return False

        if payload["machine"] != get_machine_id():
            return False

        if payload["expiry"] < int(time.time()):
            return False

        return True

    except:
        return False


def verify_online_license(license_key, server_url):
    now = int(time.time())
    machine_id = get_machine_id()
    payload = {
        "license_key": license_key,
        "machine_id": machine_id,
        "app_version": os.environ.get("FOREST_APP_VERSION", "dev"),
    }

    try:
        request = urllib.request.Request(
            server_url.rstrip("/") + "/verify",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(request, timeout=8) as response:
            data = json.loads(response.read().decode("utf-8"))

        if not data.get("active"):
            return False

        expiry = int(data.get("expiry", 0))
        if expiry < now:
            return False

        cache = {
            "license_hash": hashlib.sha256(license_key.encode("utf-8")).hexdigest(),
            "machine": machine_id,
            "expiry": expiry,
            "checked_at": now,
            "status": data.get("status", "active"),
            "plan": data.get("plan"),
            "customer": data.get("customer"),
        }
        _write_online_cache(cache)
        return True

    except (urllib.error.URLError, TimeoutError, ValueError, json.JSONDecodeError):
        cache = _read_online_cache()
        if not cache:
            return False

        expected_hash = hashlib.sha256(license_key.encode("utf-8")).hexdigest()
        cache_is_current = (
            cache.get("license_hash") == expected_hash and
            cache.get("machine") == machine_id and
            int(cache.get("expiry", 0)) >= now and
            int(cache.get("checked_at", 0)) + ONLINE_GRACE_SECONDS >= now
        )
        return bool(cache_is_current)
    

def get_license_info(license_key):
    try:
        decoded = base64.b64decode(license_key).decode()
        data = json.loads(decoded)

        payload = data["payload"]
        expiry = payload["expiry"]

        remaining_days = int((expiry - time.time()) / 86400)

        return {
            "expiry": expiry,
            "days_left": remaining_days,
            "mode": "local"
        }

    except:
        cache = _read_online_cache()
        if not cache:
            return None

        expiry = int(cache.get("expiry", 0))
        remaining_days = int((expiry - time.time()) / 86400)
        return {
            "expiry": expiry,
            "days_left": remaining_days,
            "mode": "online",
            "plan": cache.get("plan"),
            "customer": cache.get("customer"),
            "last_checked": cache.get("checked_at"),
        }
