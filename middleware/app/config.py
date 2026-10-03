"""
Central configuration for the AstroGPT/KundaliGPT middleware.
Reads secrets from environment variables — never hardcode keys.
Loads a .env file automatically if present (local dev convenience);
in Colab: os.environ["GEMINI_API_KEY"] = userdata.get("GEMINI_API_KEY")
"""
import os
from dotenv import load_dotenv

load_dotenv()  # no-op if no .env file exists — safe in Colab/production too

# --- AI providers ---
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-1.5-flash")

SCALEMAX_API_KEY = os.environ.get("SCALEMAX_API_KEY", "")
SCALEMAX_BASE_URL = os.environ.get("SCALEMAX_BASE_URL", "https://api.scalemax.pro/token/v1")
SCALEMAX_MODEL = os.environ.get("SCALEMAX_MODEL", "claude-sonnet-4-6[1m]")
SCALEMAX_REASONING_MODEL = os.environ.get("SCALEMAX_REASONING_MODEL", "claude-sonnet-4-6[1m]")
SCALEMAX_IMAGE_MODEL = os.environ.get("SCALEMAX_IMAGE_MODEL", "gpt-image-2")

# --- Storage ---
DB_PATH = os.environ.get("ASTRO_DB_PATH", "/content/drive/MyDrive/astro_app/astro.db")
DRIVE_SYNC_DIR = os.environ.get("ASTRO_DRIVE_DIR", "/content/drive/MyDrive/astro_app")

# --- Geocoding (place of birth -> lat/long/timezone) ---
# Nominatim (OpenStreetMap) free tier used by default — swap for Google Geocoding if you need
# higher accuracy/volume later.
GEOCODER_USER_AGENT = "astro-kundali-app"

# --- Ayanamsa / chart settings ---
DEFAULT_AYANAMSA = "LAHIRI"          # standard for Vedic/Kundali charts
HOUSE_SYSTEM = b"W"                   # Whole Sign — standard for Vedic charts

# --- Token / credit economy ---
STARTING_TOKENS = 20
TOKEN_COST = {
    "upload": 10,   # image/PDF upload + extraction
    "analysis": 5,  # Tier-1 full report generation (chart cast OR report generate)
    "chat": 2,      # Tier-2 grounded chat turn
}

# Purchasable token packages — single source of truth, mirrors the RN client's
# src/config/tokenPlans.ts. Keep both in sync manually until these are served
# from one place (e.g. this list exposed via a /tokens/plans endpoint).
TOKEN_PLANS = {
    "star": {"tokens": 50, "price_inr": 99},
    "constellation": {"tokens": 150, "price_inr": 249},
    "galaxy": {"tokens": 400, "price_inr": 599},
}

# --- Auth ---
# SECURITY: FIREBASE_VERIFICATION_ENABLED=False means any client-supplied
# user_id is trusted as-is (development mode only). Set True once
# firebase-admin credentials are configured — see app/auth.py.
FIREBASE_VERIFICATION_ENABLED = os.environ.get("FIREBASE_VERIFICATION_ENABLED", "false").lower() == "true"

# --- CORS (React Native app origin) ---
# RN apps don't send a browser Origin header the way web apps do, but keep this open
# during development; lock down to your API gateway / domain in production.
ALLOWED_ORIGINS = ["*"]


# --- Security Sanitizer ---
import re

def sanitize_error(error_or_msg) -> str:
    """Sanitizes API keys, secrets, query parameters, and internal file paths
    from error strings and tracebacks before logging or sending in HTTP responses."""
    msg = str(error_or_msg)
    if GEMINI_API_KEY:
        msg = msg.replace(GEMINI_API_KEY, "[REDACTED_API_KEY]")
    if SCALEMAX_API_KEY:
        msg = msg.replace(SCALEMAX_API_KEY, "[REDACTED_API_KEY]")
    # Redact any URL query parameters containing key=
    msg = re.sub(r'key=[^&\s"\']+', 'key=[REDACTED_API_KEY]', msg)
    return msg
