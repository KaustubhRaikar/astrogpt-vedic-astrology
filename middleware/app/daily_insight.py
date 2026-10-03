"""
Daily astrology intelligence — a short personalized "daily card" combining
current transits (especially the fast-moving Moon) with the user's natal
chart and current dasha. One Gemini call, structured JSON output.
"""
import json
import requests
from . import config
from .chat import transit as transit_engine

DAILY_PLANETS = ["Moon", "Sun", "Saturn", "Jupiter"]  # Moon matters most day-to-day; others for context

DAILY_SYSTEM_PROMPT = """You are a Vedic astrologer producing a short daily
insight card for this person, based on their natal chart, their current
dasha period, and today's transiting planets (given below). Interpret ONLY
from what's given — don't invent placements.

Return ONLY a JSON object with exactly these keys:
{"energy": "<one or two words, e.g. 'Positive', 'Reflective', 'Mixed'>",
 "focus": "<the life area most highlighted today, one short phrase>",
 "guidance": "<one specific, practical sentence>",
 "caution": "<one short sentence on what to be mindful of today, or null if nothing notable>"}

Follow these rules: never predict death or guarantee a specific outcome; avoid
fear-based language; frame cautions constructively. No markdown fences.
"""


def _call_gemini(system_prompt: str, user_content: str) -> str:
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{config.GEMINI_MODEL}:generateContent?key={config.GEMINI_API_KEY}"
    )
    payload = {
        "system_instruction": {"parts": [{"text": system_prompt}]},
        "contents": [{"role": "user", "parts": [{"text": user_content}]}],
        "generationConfig": {"temperature": 0.6, "response_mime_type": "application/json"},
    }
    try:
        resp = requests.post(url, json=payload, timeout=60)
        resp.raise_for_status()
        data = resp.json()
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except Exception as gemini_err:
        print(f"Gemini daily insight call failed ({config.sanitize_error(gemini_err)}). Attempting ScaleMax fallback...")
        if config.SCALEMAX_API_KEY:
            try:
                from .chat import scalemax_client
                return scalemax_client.call_scalemax(system_prompt, user_content)
            except Exception as sm_err:
                print(f"ScaleMax daily insight fallback failed: {config.sanitize_error(sm_err)}")
        raise gemini_err


def mock_daily_fallback(chart: dict) -> dict:
    asc = chart.get("ascendant_sign") or chart.get("ascendant") or "Sagittarius"
    return {
        "energy": "Harmonious",
        "focus": "Mindful reflection and strategic planning",
        "guidance": f"With your {asc} ascendant alignment, focus on steady progress in your routine today.",
        "caution": "Avoid rushing major financial decisions; allow insights to settle.",
        "transits_used": []
    }


def generate_daily_insight(chart: dict) -> dict:
    from .chart_engine import SIGNS
    try:
        asc_sign_num = SIGNS.index(chart.get("ascendant_sign", "Sagittarius"))

        todays_transits = [
            t for t in (transit_engine.get_current_transit(p, asc_sign_num) for p in DAILY_PLANETS)
            if t is not None
        ]

        user_content = json.dumps({
            "current_dasha": chart.get("current_dasha", "Ketu-Ketu"),
            "ascendant_sign": chart.get("ascendant_sign", "Sagittarius"),
            "todays_transits": todays_transits,
        }, indent=2)

        raw = _call_gemini(DAILY_SYSTEM_PROMPT, user_content)
        try:
            card = json.loads(raw)
        except json.JSONDecodeError:
            cleaned = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```")
            card = json.loads(cleaned)

        card["transits_used"] = todays_transits
        return card
    except Exception as e:
        print(f"Daily insight generation rate limit or error ({config.sanitize_error(e)}). Returning grounded fallback card.")
        return mock_daily_fallback(chart)
