import hashlib
import uuid
import os
import platform

def get_machine_id():
    mac = uuid.getnode()
    disk = os.getenv("SYSTEMDRIVE", "C")
    system = platform.system()
    cpu = platform.processor()

    raw = f"{mac}-{disk}-{system}-{cpu}"
    return hashlib.sha256(raw.encode()).hexdigest()

LICENSE_FILE = "config/license.key"


def verify_machine():
    if not os.path.exists(LICENSE_FILE):
        return False

    with open(LICENSE_FILE, "r") as f:
        stored = f.read().strip()

    return stored == get_machine_id()