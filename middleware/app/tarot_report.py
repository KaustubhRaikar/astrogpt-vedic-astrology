"""
AI interpretation of a tarot draw. ONE Gemini call. Same "interpret only
what was actually given" discipline and the same ethical response rules
used everywhere else — a tarot reading is exactly the kind of content where
fear-based or guaranteed-outcome language is tempting to slip into, so the
rules matter here as much as anywhere.
"""
import json
import requests
from . import config

RESPONSE_RULES = """Hard rules, always follow:
- Never predict death, a death date, or lifespan.
- Never give a medical diagnosis.
- Never guarantee a specific outcome (wealth, a relationship, a date) —
  tarot traditionally offers reflection and possibility, not certainty.
- Avoid fear-based or alarming language, even for traditionally "difficult"
  cards like Death or The Tower — frame them as transformation/change, the
  way tarot tradition actually does, not as literal doom.
- Use phrasing like "this card traditionally suggests..." rather than
  stating predictions as fact.
"""

TAROT_SYSTEM_PROMPT = f"""You are a warm, thoughtful tarot reader. You'll be
given the card(s) actually drawn (name, orientation, traditional meaning)
and optionally the question the person asked. Interpret ONLY the card(s)
given — never invent an additional card or a meaning not provided.

If multiple cards were drawn, also briefly note how they relate to each
other, not just each one in isolation.

Return ONLY a JSON object: {{"reading": "<the interpretation, 2-4 paragraphs>"}}
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
        "generationConfig": {"temperature": 0.7, "response_mime_type": "application/json"},
    }
    try:
        resp = requests.post(url, json=payload, timeout=60)
        resp.raise_for_status()
        data = resp.json()
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except Exception as gemini_err:
        print(f"Gemini tarot call failed ({config.sanitize_error(gemini_err)}). Attempting ScaleMax fallback...")
        if config.SCALEMAX_API_KEY:
            try:
                from .chat import scalemax_client
                return scalemax_client.call_scalemax(system_prompt, user_content)
            except Exception as sm_err:
                print(f"ScaleMax tarot fallback failed: {config.sanitize_error(sm_err)}")
        raise gemini_err


def generate_tarot_reading(cards: list[dict], question: str | None = None) -> str:
    user_content = json.dumps({"cards": cards, "question": question}, indent=2)
    try:
        raw = _call_gemini(TAROT_SYSTEM_PROMPT, user_content)
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            cleaned = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```")
            parsed = json.loads(cleaned)
        return parsed.get("reading", "The cards drawn invite reflection on your inner growth and current path.")
    except Exception as e:
        print(f"Tarot reading generation error ({config.sanitize_error(e)}). Using grounded fallback reading.")
        card_desc = ", ".join([f"{c['name']} ({c['orientation']})" for c in cards])
        return (
            f"You drew {card_desc}. "
            "This spread highlights a time of transformation and heightened self-awareness. "
            "Focus on inner alignment, balance, and mindful steps as you navigate current opportunities."
        )
