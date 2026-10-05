"""
SQLite persistence layer.
Kept dependency-free (stdlib sqlite3) so it runs in Colab without extra installs.
DB file lives on Google Drive (see config.DB_PATH) so it survives Colab restarts.

SCHEMA CHANGE (v2): charts/reports/chat_history are now keyed by chart_id
(one user -> many charts), not user_id directly, matching the RN client's
chartId-based contract (POST /kundali/report/generate, GET /kundali/report/{chartId}).
This supports a user generating charts for family/friends, not just themselves.
"""
import sqlite3
import json
import os
import uuid
from contextlib import contextmanager
from . import config

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    tokens_remaining INTEGER NOT NULL DEFAULT 20,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS charts (
    chart_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    chart_json TEXT NOT NULL,
    generated_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(user_id)
);
CREATE INDEX IF NOT EXISTS idx_charts_user_id ON charts(user_id);

CREATE TABLE IF NOT EXISTS reports (
    chart_id TEXT PRIMARY KEY,
    sections_json TEXT NOT NULL,
    generated_at TEXT NOT NULL,
    FOREIGN KEY(chart_id) REFERENCES charts(chart_id)
);

CREATE TABLE IF NOT EXISTS numerology (
    chart_id TEXT PRIMARY KEY,
    numbers_json TEXT NOT NULL,
    sections_json TEXT NOT NULL,
    generated_at TEXT NOT NULL,
    FOREIGN KEY(chart_id) REFERENCES charts(chart_id)
);

CREATE TABLE IF NOT EXISTS chat_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chart_id TEXT NOT NULL,
    role TEXT NOT NULL,
    message TEXT NOT NULL,
    intent TEXT,
    timestamp TEXT NOT NULL,
    FOREIGN KEY(chart_id) REFERENCES charts(chart_id)
);
CREATE INDEX IF NOT EXISTS idx_chat_chart_id ON chat_history(chart_id);

CREATE TABLE IF NOT EXISTS token_ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    tokens_delta INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    timestamp TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS tarot_readings (
    reading_id TEXT PRIMARY KEY,
    chart_id TEXT NOT NULL,
    cards_json TEXT NOT NULL,
    question TEXT,
    reading_text TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(chart_id) REFERENCES charts(chart_id)
);
CREATE INDEX IF NOT EXISTS idx_tarot_chart_id ON tarot_readings(chart_id);
"""


def _ensure_dir():
    d = os.path.dirname(config.DB_PATH)
    if d:
        os.makedirs(d, exist_ok=True)


@contextmanager
def get_conn():
    _ensure_dir()
    conn = sqlite3.connect(config.DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    with get_conn() as conn:
        conn.executescript(SCHEMA)


def new_chart_id() -> str:
    return str(uuid.uuid4())


# ---------- Users / auth ----------

def register_user(user_id: str) -> int:
    """Explicit registration (POST /auth/register). Idempotent — calling again
    for an existing user just returns their current balance, doesn't reset it."""
    return get_or_create_user(user_id)


def get_or_create_user(user_id: str) -> int:
    from datetime import datetime, timezone
    with get_conn() as conn:
        row = conn.execute(
            "SELECT tokens_remaining FROM users WHERE user_id = ?", (user_id,)
        ).fetchone()
        if row:
            return row["tokens_remaining"]
        conn.execute(
            "INSERT INTO users (user_id, tokens_remaining, created_at) VALUES (?, ?, ?)",
            (user_id, config.STARTING_TOKENS, datetime.now(timezone.utc).isoformat()),
        )
        return config.STARTING_TOKENS


def get_balance(user_id: str) -> int:
    return get_or_create_user(user_id)


def deduct_tokens(user_id: str, action: str, amount: int) -> int:
    """Returns new balance. Raises ValueError if insufficient."""
    from datetime import datetime, timezone
    with get_conn() as conn:
        row = conn.execute(
            "SELECT tokens_remaining FROM users WHERE user_id = ?", (user_id,)
        ).fetchone()
        if not row:
            conn.execute(
                "INSERT INTO users (user_id, tokens_remaining, created_at) VALUES (?, ?, ?)",
                (user_id, config.STARTING_TOKENS, datetime.now(timezone.utc).isoformat()),
            )
            current = config.STARTING_TOKENS
        else:
            current = row["tokens_remaining"]
        if current < amount:
            raise ValueError("insufficient_tokens")
        new_balance = current - amount
        conn.execute(
            "UPDATE users SET tokens_remaining = ? WHERE user_id = ?",
            (new_balance, user_id),
        )
        conn.execute(
            "INSERT INTO token_ledger (user_id, action, tokens_delta, balance_after, timestamp) "
            "VALUES (?, ?, ?, ?, ?)",
            (user_id, action, -amount, new_balance, datetime.now(timezone.utc).isoformat()),
        )
        return new_balance


def add_tokens(user_id: str, amount: int, action: str = "purchase") -> int:
    """Credits tokens — used by the (currently mock) purchase flow.
    SECURITY: caller must verify the payment before calling this; the DB layer
    doesn't and can't know whether a real payment happened."""
    from datetime import datetime, timezone
    with get_conn() as conn:
        get_or_create_user(user_id)
        row = conn.execute(
            "SELECT tokens_remaining FROM users WHERE user_id = ?", (user_id,)
        ).fetchone()
        new_balance = row["tokens_remaining"] + amount
        conn.execute(
            "UPDATE users SET tokens_remaining = ? WHERE user_id = ?",
            (new_balance, user_id),
        )
        conn.execute(
            "INSERT INTO token_ledger (user_id, action, tokens_delta, balance_after, timestamp) "
            "VALUES (?, ?, ?, ?, ?)",
            (user_id, action, amount, new_balance, datetime.now(timezone.utc).isoformat()),
        )
        return new_balance


# ---------- Charts (chart_id keyed, many per user) ----------

def save_new_chart(user_id: str, chart_dict: dict) -> str:
    """Creates a new chart row and returns its chart_id."""
    from datetime import datetime, timezone
    chart_id = chart_dict.get("chart_id") or new_chart_id()
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO charts (chart_id, user_id, chart_json, generated_at) VALUES (?, ?, ?, ?)",
            (chart_id, user_id, json.dumps(chart_dict), datetime.now(timezone.utc).isoformat()),
        )
    return chart_id


def get_chart(chart_id: str) -> dict | None:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT chart_json FROM charts WHERE chart_id = ?", (chart_id,)
        ).fetchone()
        return json.loads(row["chart_json"]) if row else None


def get_chart_owner(chart_id: str) -> str | None:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT user_id FROM charts WHERE chart_id = ?", (chart_id,)
        ).fetchone()
        return row["user_id"] if row else None


def list_charts_for_user(user_id: str) -> list[dict]:
    """Powers a chart-switcher UI — 'your chart', 'Priya's chart', etc."""
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT chart_id, chart_json, generated_at FROM charts "
            "WHERE user_id = ? ORDER BY generated_at DESC",
            (user_id,),
        ).fetchall()
        out = []
        for r in rows:
            chart = json.loads(r["chart_json"])
            out.append({
                "chart_id": r["chart_id"],
                "name": chart.get("name"),
                "generated_at": r["generated_at"],
            })
        return out


# ---------- Reports (chart_id keyed) ----------

def save_report(chart_id: str, sections_dict: dict):
    from datetime import datetime, timezone
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO reports (chart_id, sections_json, generated_at) VALUES (?, ?, ?) "
            "ON CONFLICT(chart_id) DO UPDATE SET sections_json=excluded.sections_json, "
            "generated_at=excluded.generated_at",
            (chart_id, json.dumps(sections_dict), datetime.now(timezone.utc).isoformat()),
        )


def get_report(chart_id: str) -> dict | None:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT sections_json FROM reports WHERE chart_id = ?", (chart_id,)
        ).fetchone()
        return json.loads(row["sections_json"]) if row else None


# ---------- Numerology (chart_id keyed) ----------

def save_numerology(chart_id: str, numbers: dict, sections: dict):
    from datetime import datetime, timezone
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO numerology (chart_id, numbers_json, sections_json, generated_at) VALUES (?, ?, ?, ?) "
            "ON CONFLICT(chart_id) DO UPDATE SET numbers_json=excluded.numbers_json, "
            "sections_json=excluded.sections_json, generated_at=excluded.generated_at",
            (chart_id, json.dumps(numbers), json.dumps(sections), datetime.now(timezone.utc).isoformat()),
        )


def get_numerology(chart_id: str) -> dict | None:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT chart_id, numbers_json, sections_json, generated_at FROM numerology WHERE chart_id = ?",
            (chart_id,),
        ).fetchone()
        if not row:
            return None
        return {
            "chart_id": row["chart_id"],
            "numbers": json.loads(row["numbers_json"]),
            "sections": json.loads(row["sections_json"]),
            "generated_at": row["generated_at"],
        }


# ---------- Chat history (chart_id keyed — one chat thread per chart) ----------

def append_chat(chart_id: str, role: str, message: str, intent: str = None):
    from datetime import datetime, timezone
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO chat_history (chart_id, role, message, intent, timestamp) "
            "VALUES (?, ?, ?, ?, ?)",
            (chart_id, role, message, intent, datetime.now(timezone.utc).isoformat()),
        )


def get_recent_chat(chart_id: str, limit: int = 6) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT role, message, timestamp FROM chat_history "
            "WHERE chart_id = ? ORDER BY id DESC LIMIT ?",
            (chart_id, limit),
        ).fetchall()
        return [dict(r) for r in reversed(rows)]


# ---------- Tarot Readings (chart_id keyed) ----------

def save_tarot_reading(chart_id: str, cards: list[dict], question: str | None, reading_text: str) -> str:
    from datetime import datetime, timezone
    reading_id = str(uuid.uuid4())
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO tarot_readings (reading_id, chart_id, cards_json, question, reading_text, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (reading_id, chart_id, json.dumps(cards), question, reading_text, datetime.now(timezone.utc).isoformat()),
        )
    return reading_id


def list_tarot_readings(chart_id: str) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT reading_id, chart_id, cards_json, question, reading_text, created_at FROM tarot_readings "
            "WHERE chart_id = ? ORDER BY created_at DESC",
            (chart_id,),
        ).fetchall()
        out = []
        for r in rows:
            out.append({
                "reading_id": r["reading_id"],
                "cards": json.loads(r["cards_json"]),
                "question": r["question"],
                "reading": r["reading_text"],
                "created_at": r["created_at"],
            })
        return out
