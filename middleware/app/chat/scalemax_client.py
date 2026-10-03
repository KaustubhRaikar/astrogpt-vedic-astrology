"""
ScaleMax fallback — Claude Sonnet 4, called via ScaleMax's Claude-compatible
endpoint (same wire format as Anthropic's own Messages API, just pointed at
ScaleMax's base URL with a ScaleMax key). Used ONLY when Gemini fails — see
ai_responder.call_gemini(), which is the single entry point everything else
calls; this file is never called directly by router.py.
"""
import requests
from app import config
from . import provider_status


def call_scalemax(system_prompt: str, user_message: str) -> str:
    base_url = config.SCALEMAX_BASE_URL.rstrip('/')
    model = config.SCALEMAX_MODEL or "claude-sonnet-4-6[1m]"

    # 1. Try Anthropic Messages endpoint format
    msg_url = f"{base_url}/messages" if base_url.endswith('/v1') else f"{base_url}/v1/messages"
    headers_msg = {
        "Authorization": f"Bearer {config.SCALEMAX_API_KEY}",
        "x-api-key": config.SCALEMAX_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
    }
    payload_msg = {
        "model": model,
        "max_tokens": 1024,
        "system": system_prompt,
        "messages": [{"role": "user", "content": user_message}],
    }

    try:
        resp = requests.post(msg_url, headers=headers_msg, json=payload_msg, timeout=60)
        if resp.ok:
            data = resp.json()
            if "content" in data and isinstance(data["content"], list) and len(data["content"]) > 0:
                provider_status.record_success("scalemax")
                return data["content"][0]["text"]
            elif "choices" in data and isinstance(data["choices"], list) and len(data["choices"]) > 0:
                provider_status.record_success("scalemax")
                return data["choices"][0]["message"]["content"]
    except Exception as err:
        print(f"ScaleMax /messages call failed: {config.sanitize_error(err)}")

    # 2. Try OpenAI Chat Completions endpoint format on ScaleMax
    comp_url = f"{base_url}/chat/completions" if base_url.endswith('/v1') else f"{base_url}/v1/chat/completions"
    headers_comp = {
        "Authorization": f"Bearer {config.SCALEMAX_API_KEY}",
        "Content-Type": "application/json",
    }
    payload_comp = {
        "model": model,
        "max_tokens": 1024,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        "temperature": 0.7,
    }

    resp = requests.post(comp_url, headers=headers_comp, json=payload_comp, timeout=60)
    if not resp.ok:
        error_summary = config.sanitize_error(f"{resp.status_code}: {resp.text[:500]}")
        print(f"ScaleMax API call failed ({model}) — {error_summary}")
        provider_status.record_failure("scalemax", error_summary)
        resp.raise_for_status()

    provider_status.record_success("scalemax")
    data = resp.json()
    return data["choices"][0]["message"]["content"]
