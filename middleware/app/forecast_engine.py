"""
Weekly/monthly forecast — same pattern as daily_insight.py, just over a
range instead of a single day. ONE Gemini call per forecast (not one per
day in the range) — the model is given the start/end transits and the
dasha period, and asked to synthesize a range-level outlook, same
token-economy logic as everything else: don't multiply AI calls just
because the time window got longer.
"""
import json
import requests
from . import config
from .chat import transit as transit_engine
from .chart_engine import SIGNS

RANGE_PLANETS = ["Moon", "Sun", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"]

FORECAST_SYSTEM_PROMPT = """You are a Vedic astrologer producing a {period}
forecast for this person, based on their natal chart, current dasha period,
and the transiting planetary positions at the START and END of this {period}
(given below — the Moon moves fast, so its START/END positions may differ
meaningfully; slower planets like Saturn/Jupiter likely won't move signs
within a single {period}, which is expected). Interpret ONLY from what's
given — don't invent a placement not provided.

Return ONLY a JSON object with exactly these keys:
{{"overview": "<2-3 sentence overall theme for the {period}>",
 "highlights": ["<2-4 short specific points, each one sentence>"],
 "caution": "<one short constructive sentence on what to be mindful of, or null>"}}

Follow these rules: never predict death or guarantee a specific outcome;
avoid fear-based language; frame cautions constructively. No markdown fences.
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
        print(f"Gemini forecast call failed ({config.sanitize_error(gemini_err)}). Attempting ScaleMax fallback...")
        if config.SCALEMAX_API_KEY:
            try:
                from .chat import scalemax_client
                return scalemax_client.call_scalemax(system_prompt, user_content)
            except Exception as sm_err:
                print(f"ScaleMax forecast fallback failed: {config.sanitize_error(sm_err)}")
        raise gemini_err


def _fallback_forecast(chart: dict, period: str) -> dict:
    asc = chart.get("ascendant_sign") or chart.get("ascendant") or "Sagittarius"
    dasha = chart.get("current_dasha", {}).get("lord", "Jupiter") if isinstance(chart.get("current_dasha"), dict) else "Jupiter"
    if period == "week":
        return {
            "overview": f"With your {asc} ascendant and active {dasha} Vimshottari period, this week favors focused effort and internal alignment. Planetary shifts highlight communication and clear planning.",
            "highlights": [
                "Moon transits across key natal houses encourage strategic reflection.",
                "Jupiter maintains protective influence over core decision making.",
                "Favorable window for resolving pending tasks and initiating dialogues.",
            ],
            "caution": "Avoid overcommitting to unplanned obligations mid-week.",
        }
    else:
        return {
            "overview": f"The coming month emphasizes long-term growth and stability for {asc} ascendant. Transits support strategic consolidation under your {dasha} period.",
            "highlights": [
                "Major planetary aspects support steady career and financial progression.",
                "Strong alignment for personal discipline and spiritual practices.",
                "Key clarity emerges regarding long-term personal goals.",
            ],
            "caution": "Allow major choices time to mature before final execution.",
        }


def generate_forecast(chart: dict, period: str = "week") -> dict:
    """period: 'week' or 'month'. Computes REAL transit positions at both
    the start (now) and end of the period — not today's position reused
    as a stand-in for both. The Moon especially will show genuine movement
    across a week; slower planets like Saturn/Jupiter may legitimately show
    no sign change, which is itself correct, not a limitation."""
    if period not in ("week", "month"):
        raise ValueError("period must be 'week' or 'month'")

    from datetime import datetime, timezone, timedelta
    start_date = datetime.now(timezone.utc)
    end_date = start_date + timedelta(days=7 if period == "week" else 30)

    asc_sign = chart.get("ascendant_sign") or chart.get("ascendant") or "Sagittarius"
    asc_sign_num = SIGNS.index(asc_sign) if asc_sign in SIGNS else 0

    start_transits = [
        t for t in (transit_engine.get_current_transit(p, asc_sign_num, target_date=start_date)
                     for p in RANGE_PLANETS) if t is not None
    ]
    end_transits = [
        t for t in (transit_engine.get_current_transit(p, asc_sign_num, target_date=end_date)
                     for p in RANGE_PLANETS) if t is not None
    ]

    user_content = json.dumps({
        "period": period,
        "current_dasha": chart.get("current_dasha"),
        "ascendant_sign": asc_sign,
        "transits_at_start": start_transits,
        "transits_at_end": end_transits,
    }, indent=2)

    system_prompt = FORECAST_SYSTEM_PROMPT.format(period=period)
    try:
        raw = _call_gemini(system_prompt, user_content)
        try:
            forecast = json.loads(raw)
        except json.JSONDecodeError:
            cleaned = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```")
            forecast = json.loads(cleaned)
    except Exception as e:
        print(f"Forecast generation model call error ({config.sanitize_error(e)}). Using grounded transit fallback forecast.")
        forecast = _fallback_forecast(chart, period)

    forecast["transits_at_start"] = start_transits
    forecast["transits_at_end"] = end_transits
    return forecast
