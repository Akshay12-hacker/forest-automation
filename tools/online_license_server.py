import argparse
import json
import os
import secrets
import sqlite3
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse


DB_PATH = os.environ.get("FOREST_LICENSE_DB", "license_server.db")
ADMIN_API_KEY = os.environ.get("FOREST_ADMIN_API_KEY", "change-me-admin-key")
TELEMETRY_API_KEY = os.environ.get("FOREST_TELEMETRY_API_KEY", "change-me-telemetry-key")


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    try:
        conn.execute("""
        CREATE TABLE IF NOT EXISTS licenses (
            license_key TEXT PRIMARY KEY,
            machine_id TEXT NOT NULL,
            customer TEXT,
            plan TEXT,
            status TEXT NOT NULL DEFAULT 'active',
            issued_at INTEGER NOT NULL,
            expiry INTEGER NOT NULL,
            last_seen_at INTEGER
        )
        """)
        conn.execute("""
        CREATE TABLE IF NOT EXISTS permit_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            license_hash TEXT,
            machine_id TEXT,
            ticket_id TEXT,
            transaction_id TEXT,
            total_amount TEXT,
            ticket_fee TEXT,
            booking_date TEXT,
            occurred_at TEXT NOT NULL,
            received_at INTEGER NOT NULL,
            raw_json TEXT NOT NULL
        )
        """)
        conn.commit()
    finally:
        conn.close()


def create_license(machine_id, days, customer=None, plan=None):
    license_key = "FA-" + secrets.token_urlsafe(32)
    now = int(time.time())
    expiry = now + int(days) * 86400

    conn = get_connection()
    try:
        conn.execute(
            """
            INSERT INTO licenses
              (license_key, machine_id, customer, plan, status, issued_at, expiry)
            VALUES (?, ?, ?, ?, 'active', ?, ?)
            """,
            (license_key, machine_id, customer, plan, now, expiry),
        )
        conn.commit()
    finally:
        conn.close()

    return {
        "license_key": license_key,
        "machine_id": machine_id,
        "customer": customer,
        "plan": plan,
        "expiry": expiry,
    }


def json_response(handler, status, body):
    data = json.dumps(body).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Content-Length", str(len(data)))
    handler.end_headers()
    handler.wfile.write(data)


def read_json(handler):
    length = int(handler.headers.get("Content-Length", "0"))
    if length <= 0:
        return {}
    return json.loads(handler.rfile.read(length).decode("utf-8"))


def bearer_token(handler):
    header = handler.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        return ""
    return header[7:].strip()


class LicenseServer(BaseHTTPRequestHandler):
    def do_POST(self):
        init_db()
        path = urlparse(self.path).path

        try:
            body = read_json(self)
        except json.JSONDecodeError:
            json_response(self, 400, {"error": "invalid_json"})
            return

        if path == "/verify":
            self.handle_verify(body)
            return

        if path == "/telemetry/permit":
            if bearer_token(self) != TELEMETRY_API_KEY:
                json_response(self, 401, {"error": "unauthorized"})
                return
            self.handle_permit_telemetry(body)
            return

        if path == "/admin/licenses":
            if bearer_token(self) != ADMIN_API_KEY:
                json_response(self, 401, {"error": "unauthorized"})
                return
            self.handle_create_license(body)
            return

        json_response(self, 404, {"error": "not_found"})

    def do_GET(self):
        init_db()
        path = urlparse(self.path).path

        if path == "/admin/stats":
            if bearer_token(self) != ADMIN_API_KEY:
                json_response(self, 401, {"error": "unauthorized"})
                return
            self.handle_stats()
            return

        json_response(self, 404, {"error": "not_found"})

    def handle_verify(self, body):
        license_key = str(body.get("license_key") or "")
        machine_id = str(body.get("machine_id") or "")
        now = int(time.time())

        conn = get_connection()
        try:
            row = conn.execute(
                "SELECT * FROM licenses WHERE license_key = ? LIMIT 1",
                (license_key,),
            ).fetchone()

            if not row:
                json_response(self, 200, {"active": False, "status": "not_found"})
                return

            if row["machine_id"] != machine_id:
                json_response(self, 200, {"active": False, "status": "machine_mismatch"})
                return

            if row["status"] != "active":
                json_response(self, 200, {"active": False, "status": row["status"]})
                return

            if int(row["expiry"]) < now:
                json_response(self, 200, {"active": False, "status": "expired", "expiry": row["expiry"]})
                return

            conn.execute(
                "UPDATE licenses SET last_seen_at = ? WHERE license_key = ?",
                (now, license_key),
            )
            conn.commit()

            json_response(self, 200, {
                "active": True,
                "status": "active",
                "expiry": row["expiry"],
                "plan": row["plan"],
                "customer": row["customer"],
            })
        finally:
            conn.close()

    def handle_create_license(self, body):
        machine_id = str(body.get("machine_id") or "").strip()
        days = int(body.get("days") or 0)
        if not machine_id or days <= 0:
            json_response(self, 400, {"error": "machine_id_and_positive_days_required"})
            return

        result = create_license(
            machine_id=machine_id,
            days=days,
            customer=body.get("customer"),
            plan=body.get("plan"),
        )
        json_response(self, 201, result)

    def handle_permit_telemetry(self, body):
        details = body.get("details") or {}
        conn = get_connection()
        try:
            conn.execute(
                """
                INSERT INTO permit_events
                  (license_hash, machine_id, ticket_id, transaction_id, total_amount,
                   ticket_fee, booking_date, occurred_at, received_at, raw_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    body.get("licenseHash"),
                    body.get("machineId"),
                    details.get("ticketId"),
                    details.get("transactionId"),
                    details.get("totalAmount"),
                    details.get("ticketFee"),
                    details.get("bookingDate"),
                    body.get("occurredAt") or "",
                    int(time.time()),
                    json.dumps(body, sort_keys=True),
                ),
            )
            conn.commit()
        finally:
            conn.close()

        json_response(self, 202, {"ok": True})

    def handle_stats(self):
        conn = get_connection()
        try:
            total = conn.execute("SELECT COUNT(*) AS c FROM permit_events").fetchone()["c"]
            by_license = [
                dict(row)
                for row in conn.execute(
                    """
                    SELECT license_hash, COUNT(*) AS permits
                    FROM permit_events
                    GROUP BY license_hash
                    ORDER BY permits DESC
                    """
                )
            ]
            recent = [
                dict(row)
                for row in conn.execute(
                    """
                    SELECT ticket_id, transaction_id, total_amount, occurred_at, received_at
                    FROM permit_events
                    ORDER BY id DESC
                    LIMIT 20
                    """
                )
            ]
        finally:
            conn.close()

        json_response(self, 200, {
            "total_permits": total,
            "by_license": by_license,
            "recent": recent,
        })

    def log_message(self, fmt, *args):
        return


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()

    init_db()
    server = ThreadingHTTPServer((args.host, args.port), LicenseServer)
    print(f"License server running at http://{args.host}:{args.port}")
    server.serve_forever()


if __name__ == "__main__":
    main()
