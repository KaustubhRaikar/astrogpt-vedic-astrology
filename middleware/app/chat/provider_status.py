"""
Tracks each AI provider's last-known status, updated passively by every real
call — no extra API calls spent just to check health. /health reads this.
"""
from datetime import datetime, timezone

_status = {
    "gemini": {"last_success_at": None, "last_failure_at": None, "last_error": None},
    "scalemax": {"last_success_at": None, "last_failure_at": None, "last_error": None},
}


def record_success(provider: str):
    _status.setdefault(provider, {})
    _status[provider]["last_success_at"] = datetime.now(timezone.utc).isoformat()
    _status[provider]["last_error"] = None


def record_failure(provider: str, error_summary: str):
    _status.setdefault(provider, {})
    _status[provider]["last_failure_at"] = datetime.now(timezone.utc).isoformat()
    _status[provider]["last_error"] = error_summary


def get_status() -> dict:
    return {k: dict(v) for k, v in _status.items()}
