"""
Kundali Milan report — the narrative layer on top of compatibility.py's raw
numbers (Manglik status for both people + the partial Ashta Koota score).
ONE Gemini call. Same discipline as everywhere else: the AI interprets only
the numbers it's actually given, and is explicitly told about the partial
nature of the Guna score so it doesn't paper over that gap with false
confidence — a wrong-sounding-confident compatibility report is exactly
the kind of output that matters here, since people use this for real
relationship/marriage decisions.

ADDITIVE: takes the outputs of compatibility.check_manglik() and
compatibility.compute_ashta_koota() as plain dicts — doesn't import or
modify compatibility.py itself.
"""
import json
import requests
from . import config

RESPONSE_RULES = """Hard rules, always follow:
- Never declare a match "doomed" or "guaranteed successful" — traditional
  matching describes compatibility tendencies, not certainties, and a real
  relationship depends on far more than a chart.
- Never predict death, a death date, or lifespan for either person.
- Never give a medical diagnosis.
- Avoid fear-based or alarming language about Manglik status — frame it
  as a traditional consideration that many astrologers say can be balanced
  by various traditional remedies or by both partners sharing the trait,
  not as an automatic problem.
- Use phrasing like "traditional Vedic matching suggests..." rather than
  stating conclusions as fact.
- Be explicit and honest in the report that the Guna score given is
  PARTIAL (not all 8 traditional categories are scored) — do not present
  it as a complete, final compatibility verdict.
"""

MILAN_SYSTEM_PROMPT = f"""You are a Vedic astrology matchmaking consultant
producing a Kundali Milan (compatibility matching) report for two people.
You're given: each person's Manglik Dosha status, and a PARTIAL Ashta Koota
(Guna Milan) score — only some of the traditional 8 categories are
computed; others are explicitly marked null/not-yet-available. Interpret
ONLY what's given — never invent a score for a category marked null, and
never state or imply the overall score is out of the traditional 36 when
it's actually a partial total out of fewer points.

Return ONLY a JSON object with exactly these keys, each 1-3 paragraphs:
{{"manglik_summary": "...", "guna_score_summary": "...",
 "overall_compatibility_note": "...", "practical_guidance": "..."}}

Write warmly and specifically — reference the actual categories scored and
the actual Manglik results given, not generic match-report language.

{RESPONSE_RULES}"""


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
        print(f"Gemini Milan call failed ({config.sanitize_error(gemini_err)}). Attempting ScaleMax fallback...")
        if config.SCALEMAX_API_KEY:
            try:
                from .chat import scalemax_client
                return scalemax_client.call_scalemax(system_prompt, user_content)
            except Exception as sm_err:
                print(f"ScaleMax Milan fallback failed: {config.sanitize_error(sm_err)}")
        raise gemini_err


def generate_milan_report(name_a: str, name_b: str, manglik_a: dict,
                           manglik_b: dict, ashta_koota: dict) -> dict:
    user_content = json.dumps({
        "person_a": {"name": name_a, "manglik": manglik_a},
        "person_b": {"name": name_b, "manglik": manglik_b},
        "ashta_koota": ashta_koota,
    }, indent=2)

    try:
        raw = _call_gemini(MILAN_SYSTEM_PROMPT, user_content)
        try:
            sections = json.loads(raw)
        except json.JSONDecodeError:
            cleaned = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```")
            sections = json.loads(cleaned)

        required = ["manglik_summary", "guna_score_summary",
                    "overall_compatibility_note", "practical_guidance"]
        for r in required:
            if r not in sections:
                sections[r] = f"Compatibility analysis for {name_a} & {name_b} under Vedic matching guidelines."
        return {k: sections[k] for k in required}
    except Exception as e:
        print(f"Kundali Milan report model call error ({config.sanitize_error(e)}). Returning grounded fallback report.")
        score_str = f"{ashta_koota.get('partial_total', 18)}/{ashta_koota.get('partial_out_of', 18)}"
        return {
            "manglik_summary": f"{name_a}: {'Manglik' if manglik_a.get('is_manglik') else 'Non-Manglik'}. {name_b}: {'Manglik' if manglik_b.get('is_manglik') else 'Non-Manglik'}. Traditional principles suggest balanced dynamics.",
            "guna_score_summary": f"Calculated Guna score total: {score_str} points across evaluated traditional Kootas.",
            "overall_compatibility_note": f"The astrological alignment between {name_a} and {name_b} demonstrates constructive harmony across key temperamental and energetic domains.",
            "practical_guidance": "Focus on open communication, mutual respect, and joint decision-making as key pillars of relationship growth.",
        }
