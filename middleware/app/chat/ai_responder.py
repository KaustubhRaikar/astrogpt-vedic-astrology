"""
The catch-all AI layer. Everything that isn't a recognized natal-lookup or
transit question lands here — general astrology knowledge, interpretive
questions, follow-ups, and genuinely open-ended messages.

IMPROVEMENTS (from the SkillAI chat NLP lessons + this project's own Gemini
429 incident):
  - Failures now log the actual status code + response body, not a bare
    raise_for_status() with no context. The 429/bad-key incident took far
    longer to diagnose than it should have because nothing surfaced what
    Google's API actually said.
  - Every call updates provider_status.py so /health can report real
    connectivity — no more "status: ok" while every chat request is
    silently failing behind the scenes.
  - NEVER catch this exception and substitute placeholder text here. That
    exact anti-pattern (a fallback that manufactures plausible-looking fake
    output on failure) is what caused the multi-hour debugging session in
    the first place. A failure must propagate as a real error.
"""
import requests
from app import config
from . import provider_status

CHAT_SYSTEM_PROMPT_TEMPLATE = """You are a warm, deeply knowledgeable Vedic astrologer
having an ongoing, natural conversation with {name} — this is a real back-and-forth,
not a series of one-off Q&As, so read the recent conversation below and respond the
way a person would: acknowledging what was just said, not restarting from scratch
each turn.

You've already done a full, in-depth reading of {name}'s birth chart — personality,
career, relationships, health, family, current life period, key yogas/doshas, and
life themes — all given below. You're a complete astrology expert, not limited to
one topic:

1. Questions about THEIR specific chart — stay grounded in the analysis and chart
   facts given below. Never invent a placement, house, or period not given to you.
2. General astrology knowledge (explaining a term, a type of yoga/dosha, how
   something works in general) — answer freely from your own expertise, the way a
   real astrologer would, even if that exact phrase isn't a literal quote below.
   Don't deflect a "what does X mean" question just because X isn't verbatim in
   the given text.
3. Anything else — small talk, a tangent, a question with nothing to do with
   astrology — respond naturally and warmly like a person would, then you can
   gently bring it back to their chart if it fits, but don't refuse or force
   every message into an astrology frame.

If asked to explain something in simpler words, rephrase YOUR OWN previous reply
in plainer language — check the conversation below for what they mean, don't
treat it as an unrelated new question.

Hard rules, always follow these regardless of what's asked:
- Never predict death, a death date, or anyone's lifespan.
- Never give a medical diagnosis or tell someone what illness they have —
  you can note traditional associations (e.g. "this placement is traditionally
  linked to joint health"), but always frame it as traditional interpretation,
  never medical fact, and suggest seeing a doctor for real health concerns.
- Never guarantee a specific wealth outcome, marriage date, or other
  guaranteed future event — describe tendencies and favorable/unfavorable
  periods, not certainties.
- Avoid fear-based or alarming language; frame difficult periods constructively.
- Use phrasing like "traditional astrology suggests..." rather than stating
  predictions as fact.

Full analysis:
{full_report}

Key chart facts:
{chart_facts}

Recent conversation:
{history}
"""


def call_gemini(system_prompt: str, user_message: str) -> str:
    """Tries Gemini first; on failure, falls back to Claude Sonnet 4 via
    ScaleMax. The fallback call is wrapped in its OWN try/except.
    If BOTH fail, this raises a real error — it never fabricates a reply."""
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{config.GEMINI_MODEL}:generateContent?key={config.GEMINI_API_KEY}"
    )
    payload = {
        "system_instruction": {"parts": [{"text": system_prompt}]},
        "contents": [{"role": "user", "parts": [{"text": user_message}]}],
        "generationConfig": {"temperature": 0.7},
    }

    try:
        resp = requests.post(url, json=payload, timeout=60)
        if not resp.ok:
            error_summary = config.sanitize_error(f"{resp.status_code}: {resp.text[:500]}")
            print(f"Gemini API call failed — {error_summary}")
            provider_status.record_failure("gemini", error_summary)

            if not config.SCALEMAX_API_KEY:
                resp.raise_for_status()

            try:
                from . import scalemax_client
                return scalemax_client.call_scalemax(system_prompt, user_message)
            except Exception as fallback_error:
                sanitized_fb = config.sanitize_error(fallback_error)
                raise RuntimeError(
                    f"Both AI providers failed. Gemini: {error_summary}. "
                    f"ScaleMax: {sanitized_fb}"
                ) from fallback_error

        provider_status.record_success("gemini")
        data = resp.json()
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except Exception as gemini_exception:
        error_summary = config.sanitize_error(gemini_exception)
        print(f"Gemini API exception — {error_summary}")
        provider_status.record_failure("gemini", error_summary)

        if not config.SCALEMAX_API_KEY:
            raise gemini_exception

        try:
            from . import scalemax_client
            return scalemax_client.call_scalemax(system_prompt, user_message)
        except Exception as fallback_error:
            sanitized_fb = config.sanitize_error(fallback_error)
            raise RuntimeError(
                f"Both AI providers failed. Gemini: {error_summary}. "
                f"ScaleMax: {sanitized_fb}"
            ) from fallback_error


def build_system_prompt(name: str, full_report: str, chart_facts: str, history: str) -> str:
    return CHAT_SYSTEM_PROMPT_TEMPLATE.format(
        name=name, full_report=full_report, chart_facts=chart_facts, history=history,
    )
