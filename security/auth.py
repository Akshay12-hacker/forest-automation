import os
import pickle
from security.crypto import hash_password, verify_password

USER_FILE = "config/users.sec"

def create_user(username: str, password: str):
    if os.path.exists(USER_FILE):
        raise Exception("User already exists")

    data = {
        "username": username,
        "password": hash_password(password)
    }

    with open(USER_FILE, "wb") as f:
        pickle.dump(data, f)

def authenticate(username: str, password: str) -> bool:
    if not os.path.exists(USER_FILE):
        return False

    with open(USER_FILE, "rb") as f:
        data = pickle.load(f)

    if data["username"] != username:
        return False

    return verify_password(password, data["password"])


