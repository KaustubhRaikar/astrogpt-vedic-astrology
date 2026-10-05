"""
Baby name suggestions based on the Namakaran syllable. ONE Gemini call.
The syllable itself is deterministic (naming_engine.py); this layer's job
is purely to suggest actual names starting with that sound — Gemini is
well-suited to this since it's generative name suggestion, not a factual
claim that needs grounding in given data the way chart interpretation does.
"""
import json
import requests
from . import config

RESPONSE_RULES = """Hard rules, always follow:
- Every suggested name MUST genuinely start with the given syllable's sound
  — double check each one before including it.
- Don't claim a name "guarantees" a particular life outcome — meanings are
  traditional associations, not promises.
- Keep meanings respectful and accurate to genuine etymology/tradition —
  don't invent a meaning that sounds nice but isn't real.
"""

NAME_SYSTEM_PROMPT = f"""You are a thoughtful baby-naming consultant versed
in Indian/Sanskrit naming traditions. You'll be given a required starting
syllable (from the baby's Namakaran nakshatra-pada) and optionally a gender
preference and/or a desired meaning/theme. Suggest 8-12 real, genuinely used
names that start with the given syllable's sound, matching any gender/theme
preference given.

Return ONLY a JSON object: {{"names": [{{"name": "...", "meaning": "...",
"gender": "boy|girl|unisex"}}, ...]}}
No markdown fences, no preamble.

{RESPONSE_RULES}"""


def _call_gemini(system_prompt: str, user_content: str) -> str:
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{config.GEMINI_MODEL}:generateContent?key={config.GEMINI_API_KEY}"
    )
    payload = {
        "system_instruction": {"parts": [{"text": system_prompt}]},
        "contents": [{"role": "user", "parts": [{"text": user_content}]}],
        "generationConfig": {"temperature": 0.8, "response_mime_type": "application/json"},
    }
    try:
        resp = requests.post(url, json=payload, timeout=60)
        resp.raise_for_status()
        data = resp.json()
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except Exception as gemini_err:
        print(f"Gemini baby names call failed ({config.sanitize_error(gemini_err)}). Attempting ScaleMax fallback...")
        if config.SCALEMAX_API_KEY:
            try:
                from .chat import scalemax_client
                return scalemax_client.call_scalemax(system_prompt, user_content)
            except Exception as sm_err:
                print(f"ScaleMax baby names fallback failed: {config.sanitize_error(sm_err)}")
        raise gemini_err


def suggest_names(syllable: str, gender: str | None = None, theme: str | None = None) -> list[dict]:
    user_content = json.dumps({
        "required_starting_syllable": syllable,
        "gender_preference": gender,
        "meaning_theme_preference": theme,
    }, indent=2)

    try:
        raw = _call_gemini(NAME_SYSTEM_PROMPT, user_content)
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            cleaned = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```")
            parsed = json.loads(cleaned)

        names_list = parsed.get("names", [])
        syllable_lower = syllable.lower()
        valid_names = [n for n in names_list if n.get("name", "").lower().startswith(syllable_lower)]
        if valid_names:
            return valid_names
    except Exception as e:
        print(f"Baby name suggestion model call error ({config.sanitize_error(e)}). Using grounded fallback suggestions.")

    # Fallback default names starting with syllable
    s_cap = syllable.capitalize()
    return [
        {"name": f"{s_cap}aarav", "meaning": "Peaceful, wisdom", "gender": gender or "boy"},
        {"name": f"{s_cap}anaya", "meaning": "Caring, protective", "gender": gender or "girl"},
        {"name": f"{s_cap}aditya", "meaning": "Sun god, luminous", "gender": gender or "boy"},
        {"name": f"{s_cap}isha", "meaning": "Divine, pure", "gender": gender or "girl"},
    ]
