"""
Auth dependency for FastAPI routes. Verifies the Firebase ID token the RN
client now sends as `Authorization: Bearer <token>` (per client.ts), and
returns the verified user_id (Firebase UID) for the route to use.

DEV MODE: with FIREBASE_VERIFICATION_ENABLED=false (the default), this trusts
whatever UID the client claims via the Bearer token payload WITHOUT verifying
the signature. This is what lets the app work end-to-end before real Firebase
credentials exist. It is NOT safe for production — anyone could claim any
user_id and spend/see another user's tokens and charts. Flip
FIREBASE_VERIFICATION_ENABLED=true and provide a service account (see below)
before shipping.
"""
from fastapi import Header, HTTPException
from . import config

_firebase_app = None


def _get_firebase_app():
    global _firebase_app
    if _firebase_app is None:
        import firebase_admin
        from firebase_admin import credentials
        # Point this at your service account JSON, e.g. via
        # GOOGLE_APPLICATION_CREDENTIALS env var, or credentials.Certificate(path)
        cred = credentials.ApplicationDefault()
        _firebase_app = firebase_admin.initialize_app(cred)
    return _firebase_app


def _decode_unverified(token: str) -> str:
    """Dev-mode only: pulls the `sub` (or `user_id`) claim out of the JWT
    payload without checking the signature. Good enough to keep the app
    demoable end-to-end; must not be used once real users exist."""
    import base64
    import json
    try:
        if "." in token:
            payload_b64 = token.split(".")[1]
            padded = payload_b64 + "=" * (-len(payload_b64) % 4)
            payload = json.loads(base64.urlsafe_b64decode(padded))
            uid = payload.get("user_id") or payload.get("sub")
            if uid:
                return str(uid)
        return token if token else "dev_user"
    except Exception:
        return token if token else "dev_user"


async def get_current_user_id(authorization: str = Header(default=None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.removeprefix("Bearer ").strip()

    if not config.FIREBASE_VERIFICATION_ENABLED:
        return _decode_unverified(token)

    from firebase_admin import auth as firebase_auth
    _get_firebase_app()
    try:
        decoded = firebase_auth.verify_id_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return decoded["uid"]
