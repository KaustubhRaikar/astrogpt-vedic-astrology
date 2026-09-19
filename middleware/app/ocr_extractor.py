"""
Path B input: user uploads an image or PDF (existing kundali chart, birth
certificate, handwritten notes) instead of typing the form. Gemini's vision
input extracts the four fields we actually need — it does NOT calculate any
astrology here, only reads text/fields off the image. The extracted fields
then flow into the exact same chart_engine.generate_chart() as Path A.
"""
import base64
import json
import requests
from . import config

EXTRACTION_PROMPT = """Look at this image/document. Extract ONLY these four fields
if present: name, date of birth (as YYYY-MM-DD), time of birth (as HH:MM 24hr),
place of birth. If a field is missing, illegible, or not present, set it to null —
never guess or invent a value.

Return ONLY a JSON object: {"name": ..., "dob": ..., "time_of_birth": ..., "place_of_birth": ...}
No markdown fences, no extra text.
"""


def extract_birth_data(file_bytes: bytes, mime_type: str) -> dict:
    """mime_type e.g. 'image/jpeg', 'image/png', 'application/pdf'."""
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{config.GEMINI_MODEL}:generateContent?key={config.GEMINI_API_KEY}"
    )
    b64_data = base64.b64encode(file_bytes).decode("utf-8")
    payload = {
        "contents": [{
            "role": "user",
            "parts": [
                {"text": EXTRACTION_PROMPT},
                {"inline_data": {"mime_type": mime_type, "data": b64_data}},
            ],
        }],
        "generationConfig": {"temperature": 0.1, "response_mime_type": "application/json"},
    }
    resp = requests.post(url, json=payload, timeout=60)
    resp.raise_for_status()
    data = resp.json()
    raw = data["candidates"][0]["content"]["parts"][0]["text"]

    try:
        fields = json.loads(raw)
    except json.JSONDecodeError:
        cleaned = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```")
        fields = json.loads(cleaned)

    missing = [k for k in ("name", "dob", "time_of_birth", "place_of_birth")
               if not fields.get(k)]
    if missing:
        raise ValueError(f"Could not extract required fields from upload: {missing}")

    return fields
