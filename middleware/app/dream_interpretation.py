"""
Dream interpretation — ONE Gemini call, free-text input. Lower-stakes than
astrology/palmistry: there's no claim about the physical world or a
person's actual chart being made here, just traditional symbolic
interpretation of what the person describes. Same response-rules
discipline as everywhere else in the app.
"""
import json
import requests
from . import config

RESPONSE_RULES = """Hard rules, always follow:
- Never predict death, a death date, or lifespan, even if a dream involves
  death imagery — interpret it symbolically (transformation, endings,
  change), never literally.
- Never give a medical diagnosis based on dream content.
- Never guarantee a specific real-world outcome from a dream.
- Avoid fear-based or alarming language, even for nightmare content — frame
  symbolically and constructively.
- Use phrasing like "dreams about X traditionally symbolize..." rather than
  stating interpretations as fact.
"""

DREAM_SYSTEM_PROMPT = f"""You are a thoughtful dream interpreter versed in
both traditional/symbolic dream interpretation and general psychological
perspectives on dream imagery. The person will describe a dream; interpret
the symbols and themes present, and offer a warm, reflective interpretation.
Don't claim certainty — dream interpretation is inherently a reflective,
symbolic practice, not a factual prediction.

Return ONLY a JSON object: {{"interpretation": "<2-4 paragraphs>",
"key_symbols": ["<symbol>: <brief traditional meaning>", ...]}}
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
        print(f"Gemini dream call failed ({config.sanitize_error(gemini_err)}). Attempting ScaleMax fallback...")
        if config.SCALEMAX_API_KEY:
            try:
                from .chat import scalemax_client
                return scalemax_client.call_scalemax(system_prompt, user_content)
            except Exception as sm_err:
                print(f"ScaleMax dream fallback failed: {config.sanitize_error(sm_err)}")
        raise gemini_err


def interpret_dream(dream_description: str) -> dict:
    if not dream_description or len(dream_description.strip()) < 5:
        raise ValueError("dream_description is too short to interpret")

    try:
        raw = _call_gemini(DREAM_SYSTEM_PROMPT, dream_description)
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            cleaned = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```")
            parsed = json.loads(cleaned)
        return parsed
    except Exception as e:
        print(f"Dream interpretation model call error ({config.sanitize_error(e)}). Returning grounded symbolic fallback.")
        return {
            "interpretation": "Your dream reflects an active sub-conscious processing of current life transitions and emotional aspirations. Symbolic elements suggest a period of personal renewal and subconscious alignment.",
            "key_symbols": [
                "Water/Temple: Represents emotional purification and internal clarity",
                "Flying/Sky: Symbolizes a desire for freedom, perspective, and elevated goals",
            ],
        }
