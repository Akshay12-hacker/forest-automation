import json
import hashlib
import base64
import time
from security.machine_lock import get_machine_id
import hmac

SECRET = "FOREST_AUTOMATION_PRIVATE_KEY"

def generate_license(machine_id, days=365):
    expiry = int(time.time()) + days * 86400

    payload = {
        "machine": machine_id,
        "expiry": expiry
    }

    payload_str = json.dumps(payload)

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
    try:
        decoded = base64.b64decode(license_key).decode()
        data = json.loads(decoded)

        payload = data["payload"]
        signature = data["signature"]

        expected = hmac.new(
            SECRET.encode(),
            json.dumps(payload).encode(),
            hashlib.sha256
        ).hexdigest()

        if expected != signature:
            return False

        if payload["machine"] != get_machine_id():
            return False

        if payload["expiry"] < int(time.time()):
            return False

        return True

    except:
        return False
    

def get_license_info(license_key):
    try:
        decoded = base64.b64decode(license_key).decode()
        data = json.loads(decoded)

        payload = data["payload"]
        expiry = payload["expiry"]

        remaining_days = int((expiry - time.time()) / 86400)

        return {
            "expiry": expiry,
            "days_left": remaining_days
        }

    except:
        return None