from security.crypto import hash_password, verify_password
from security.db import get_connection, init_db


def _normalized_username(username: str) -> str:
    return (username or "").strip()


def create_user(username: str, password: str):
    user = _normalized_username(username)
    if not user:
        raise ValueError("Username is required")
    if not password:
        raise ValueError("Password is required")
    if len(user) < 3:
        raise ValueError("Username must be at least 3 characters")
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters")

    init_db()
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT 1 FROM users WHERE username = ?", (user,))
        if cursor.fetchone():
            raise ValueError("User already exists")

        password_hash = hash_password(password).decode("utf-8")
        cursor.execute(
            "INSERT INTO users (username, password) VALUES (?, ?)",
            (user, password_hash),
        )
        conn.commit()
    finally:
        conn.close()


def authenticate(username: str, password: str) -> bool:
    user = _normalized_username(username)
    if not user or not password:
        return False

    init_db()
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT password FROM users WHERE username = ? LIMIT 1",
            (user,),
        )
        row = cursor.fetchone()
    finally:
        conn.close()

    if not row:
        return False

    stored_hash = row[0]
    if isinstance(stored_hash, str):
        stored_hash = stored_hash.encode("utf-8")
    return verify_password(password, stored_hash)


def get_user_count() -> int:
    init_db()
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM users")
        row = cursor.fetchone()
        return int(row[0]) if row else 0
    finally:
        conn.close()


