"""
AI interpretation of a computed numerology profile. ONE Gemini call, not a
multi-agent pipeline — numerology is a smaller add-on feature and doesn't
warrant the astrology report's 5-call depth. Same ethical response rules as
the rest of the app (no death predictions, no guaranteed outcomes, etc.).

ADDITIVE: only depends on config.py (already in the app) and the numbers
dict from numerology_engine.py — doesn't touch or import anything from the
astrology code path, so it can't disturb it.
"""
import json
import requests
from . import config

RESPONSE_RULES = """Hard rules, always follow:
- Never predict death, a death date, or lifespan.
- Never give a medical diagnosis.
- Never guarantee a specific wealth outcome, marriage date, or other
  guaranteed future event — describe tendencies, not certainties.
- Avoid fear-based or alarming language.
- Use phrasing like "numerology traditionally suggests..." rather than
  stating predictions as fact.
"""

NUMEROLOGY_SYSTEM_PROMPT = f"""You are a numerology expert. Given this
person's computed numerology numbers (Life Path, Destiny/Expression, Soul
Urge, Personality, Birthday, Maturity), interpret what each number
traditionally means for them, and how they relate to each other. Interpret
ONLY from the numbers given — don't invent a number not provided.

Return ONLY a JSON object with exactly these keys, each a string of 1-3
paragraphs:
{{"life_path_meaning": "...", "destiny_meaning": "...", "soul_urge_meaning": "...",
 "personality_meaning": "...", "overall_synthesis": "..."}}

Write in plain, natural language — not generic listicle style. No markdown
fences, no preamble.

{RESPONSE_RULES}"""


def _call_scalemax(system_prompt: str, user_content: str) -> str | None:
    if not config.SCALEMAX_API_KEY:
        return None
    url = f"{config.SCALEMAX_BASE_URL.rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {config.SCALEMAX_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": config.SCALEMAX_REASONING_MODEL or config.SCALEMAX_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ],
        "temperature": 0.6,
        "response_format": {"type": "json_object"},
    }
    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=60)
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]
    except Exception as e:
        print(f"ScaleMax numerology report generation call failed: {config.sanitize_error(e)}")
        return None


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
    except Exception as gemini_error:
        print(f"Gemini numerology call failed ({config.sanitize_error(gemini_error)}). Attempting ScaleMax fallback...")
        if config.SCALEMAX_API_KEY:
            scalemax_res = _call_scalemax(system_prompt, user_content)
            if scalemax_res:
                return scalemax_res
        raise gemini_error


def mock_fallback_sections(numbers: dict) -> dict:
    lp = numbers.get("life_path_number", 1)
    destiny = numbers.get("destiny_number", 1)
    soul = numbers.get("soul_urge_number", 1)
    personality = numbers.get("personality_number", 1)
    return {
        "life_path_meaning": f"Your Life Path number is {lp}. This indicates a primary life direction centered around purpose, growth, and self-mastery.",
        "destiny_meaning": f"Your Destiny number is {destiny}, reflecting your core talents and the legacy you are building through your actions.",
        "soul_urge_meaning": f"Your Soul Urge number is {soul}, pointing to your deepest inner desires and emotional motivations.",
        "personality_meaning": f"Your Personality number is {personality}, showing the outward traits and initial impressions you project to the world.",
        "overall_synthesis": f"With a Life Path of {lp} and Destiny of {destiny}, your numerological profile shows a harmonious synthesis of inner purpose and practical achievement."
    }


def generate_numerology_report(numbers: dict) -> dict:
    required = ["life_path_meaning", "destiny_meaning", "soul_urge_meaning",
                "personality_meaning", "overall_synthesis"]
    try:
        raw = _call_gemini(NUMEROLOGY_SYSTEM_PROMPT, json.dumps(numbers, indent=2))
        try:
            sections = json.loads(raw)
        except json.JSONDecodeError:
            cleaned = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```")
            sections = json.loads(cleaned)

        missing = [k for k in required if k not in sections]
        if not missing:
            return {k: sections[k] for k in required}
        return mock_fallback_sections(numbers)
    except Exception as e:
        print(f"Gemini/ScaleMax numerology report generation error ({config.sanitize_error(e)}). Using fallback report.")
        return mock_fallback_sections(numbers)
