from security.crypto import hash_password, verify_password
from security.db import get_connection, init_db
import time


MAX_FAILED_LOGINS = 5
LOCKOUT_SECONDS = 15 * 60


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
        now = int(time.time())
        cursor.execute(
            "SELECT failed_count, locked_until FROM login_attempts WHERE username = ? LIMIT 1",
            (user,),
        )
        attempt = cursor.fetchone()
        if attempt and int(attempt[1] or 0) > now:
            return False

        cursor.execute(
            "SELECT password FROM users WHERE username = ? LIMIT 1",
            (user,),
        )
        row = cursor.fetchone()
        if not row:
            _record_failed_login(cursor, user, now)
            conn.commit()
            return False

        stored_hash = row[0]
        if isinstance(stored_hash, str):
            stored_hash = stored_hash.encode("utf-8")

        verified = verify_password(password, stored_hash)
        if verified:
            cursor.execute("DELETE FROM login_attempts WHERE username = ?", (user,))
        else:
            _record_failed_login(cursor, user, now)
        conn.commit()
        return verified
    finally:
        conn.close()


def _record_failed_login(cursor, username: str, now: int):
    cursor.execute(
        "SELECT failed_count FROM login_attempts WHERE username = ? LIMIT 1",
        (username,),
    )
    row = cursor.fetchone()
    failed_count = int(row[0]) + 1 if row else 1
    locked_until = now + LOCKOUT_SECONDS if failed_count >= MAX_FAILED_LOGINS else 0

    cursor.execute(
        """
        INSERT INTO login_attempts (username, failed_count, locked_until, last_failed_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(username) DO UPDATE SET
          failed_count = excluded.failed_count,
          locked_until = excluded.locked_until,
          last_failed_at = excluded.last_failed_at
        """,
        (username, failed_count, locked_until, now),
    )


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


