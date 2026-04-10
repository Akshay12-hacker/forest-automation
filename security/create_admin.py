from security.auth import create_user
import os

username = os.environ.get("FOREST_ADMIN_USERNAME")
password = os.environ.get("FOREST_ADMIN_PASSWORD")

if not username or not password:
    raise RuntimeError("Set FOREST_ADMIN_USERNAME and FOREST_ADMIN_PASSWORD")

if len(password) < 10:
    raise RuntimeError("FOREST_ADMIN_PASSWORD must be at least 10 characters")

create_user(username, password)
print(f"User '{username}' created")