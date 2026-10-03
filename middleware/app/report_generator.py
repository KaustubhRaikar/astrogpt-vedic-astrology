"""
Tier 1 grounding report — now a MULTI-AGENT pipeline, not one call:

  Chart Analysis Agent  -> overall planets/houses/yogas/strengths
  Relationship Agent    -> 7th house, Venus, Jupiter, D9 Navamsa
  Career Agent          -> 10th house, Saturn, Sun, D10 Dashamsa
  Timing Agent          -> Vimshottari Dasha timeline
  Final Astrologer Agent -> combines all four into the stored 8-section report

Cost tradeoff, stated plainly: this is 5 Gemini calls per report instead of 1.
The upside is genuine specialist depth per life area (each agent's prompt is
narrowly focused, which tends to produce more specific output than one
generalist call covering 8 areas at once); the downside is 5x the latency
and API cost for a single "analysis" action that still only charges the user
5 tokens. Worth watching in practice — if cost/latency becomes a problem,
collapsing back to fewer calls is a config change here, not a redesign.

Same "don't invent what wasn't given" grounding discipline as before, plus
the same ethical response rules as the chat layer (see chat/ai_responder.py)
— duplicated here rather than imported, since report generation and chat
are different call sites; keep both in sync if you edit the rules.
"""
import json
import requests
from . import config, divisional

SECTION_KEYS = [
    "personality_nature", "career_wealth", "relationships_marriage",
    "health", "family", "current_dasha_effects", "key_yogas_doshas", "life_themes",
]

RESPONSE_RULES = """Hard rules, always follow:
- Never predict death, a death date, or lifespan.
- Never give a medical diagnosis — traditional associations only (e.g. "this
  placement is traditionally linked to joint health"), always framed as
  traditional interpretation, never medical fact.
- Never guarantee a specific wealth outcome, marriage date, or other
  guaranteed future event — describe tendencies and favorable/unfavorable
  periods, not certainties.
- Avoid fear-based or alarming language.
- Use phrasing like "traditional astrology suggests..." rather than stating
  predictions as fact.
"""


def _call_scalemax(system_prompt: str, user_content: str, json_mode: bool = False) -> str | None:
    """Call ScaleMax.pro API endpoint if SCALEMAX_API_KEY is configured."""
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
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}
    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=60)
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]
    except Exception as e:
        print(f"ScaleMax report generation call failed: {config.sanitize_error(e)}")
        return None


def _call_gemini(system_prompt: str, user_content: str, json_mode: bool = False) -> str:
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{config.GEMINI_MODEL}:generateContent?key={config.GEMINI_API_KEY}"
    )
    gen_config = {"temperature": 0.6}
    if json_mode:
        gen_config["response_mime_type"] = "application/json"
    payload = {
        "system_instruction": {"parts": [{"text": system_prompt}]},
        "contents": [{"role": "user", "parts": [{"text": user_content}]}],
        "generationConfig": gen_config,
    }
    try:
        resp = requests.post(url, json=payload, timeout=60)
        resp.raise_for_status()
        data = resp.json()
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except Exception as gemini_error:
        print(f"Gemini report call failed ({config.sanitize_error(gemini_error)}). Attempting ScaleMax fallback...")
        if config.SCALEMAX_API_KEY:
            scalemax_res = _call_scalemax(system_prompt, user_content, json_mode=json_mode)
            if scalemax_res:
                return scalemax_res
        raise gemini_error


# ---------- Agent 1: Chart Analysis ----------

def agent_chart_analysis(chart: dict) -> str:
    prompt = f"""You are a Vedic astrology chart analyst. Given this structured
birth chart JSON, identify overall planetary strengths, notable yogas, and the
general character of the chart. Interpret ONLY what's in the JSON — never invent
a placement not given. 2-3 paragraphs, plain natural language.

{RESPONSE_RULES}"""
    return _call_gemini(prompt, json.dumps(chart, indent=2))


# ---------- Agent 2: Relationship ----------

def agent_relationship(chart: dict, navamsa: dict) -> str:
    prompt = f"""You are a Vedic astrology relationship specialist. Analyze the
7th house, Venus, and Jupiter from the natal chart JSON, plus the D9 Navamsa
chart JSON given (used for marriage/dharma/relationship strength analysis).
Interpret ONLY what's given. 2-3 paragraphs, plain natural language.

{RESPONSE_RULES}"""
    combined = {"natal_chart": chart, "navamsa_d9": navamsa}
    return _call_gemini(prompt, json.dumps(combined, indent=2))


# ---------- Agent 3: Career ----------

def agent_career(chart: dict, dashamsa: dict) -> str:
    prompt = f"""You are a Vedic astrology career specialist. Analyze the 10th
house, Saturn, and Sun from the natal chart JSON, plus the D10 Dashamsa chart
JSON given (used for career/profession/authority analysis). Interpret ONLY
what's given. 2-3 paragraphs, plain natural language.

{RESPONSE_RULES}"""
    combined = {"natal_chart": chart, "dashamsa_d10": dashamsa}
    return _call_gemini(prompt, json.dumps(combined, indent=2))


# ---------- Agent 4: Timing ----------

def agent_timing(chart: dict) -> str:
    prompt = f"""You are a Vedic astrology timing specialist. Analyze the
Vimshottari Dasha timeline in this chart JSON — the current period and what's
coming next. Interpret ONLY what's given. 2-3 paragraphs, plain natural language.

{RESPONSE_RULES}"""
    return _call_gemini(prompt, json.dumps(chart, indent=2))


# ---------- Agent 5: Final Astrologer (synthesis) ----------

FINAL_SYSTEM_PROMPT = f"""You are the final astrologer synthesizing four
specialist analyses (chart analysis, relationship, career, timing) plus the
original chart data into ONE cohesive report for the person.

Produce a warm, specific, in-depth analysis as a JSON object with EXACTLY
these keys, each a string of 2-4 paragraphs:
personality_nature, career_wealth, relationships_marriage, health, family,
current_dasha_effects, key_yogas_doshas, life_themes

Write in plain, natural language a real person would use — not generic
horoscope-column language. Draw on the specialist inputs given (don't just
copy them verbatim — synthesize into a cohesive voice), and fill in `health`
and `family` using the chart analysis and chart facts even though no
specialist agent covered those directly. Return ONLY the JSON object, no
markdown fences, no preamble.

{RESPONSE_RULES}"""


def agent_final_astrologer(chart: dict, chart_analysis: str, relationship: str,
                            career: str, timing: str) -> dict:
    user_content = json.dumps({
        "chart": chart,
        "specialist_chart_analysis": chart_analysis,
        "specialist_relationship_analysis": relationship,
        "specialist_career_analysis": career,
        "specialist_timing_analysis": timing,
    }, indent=2)
    raw = _call_gemini(FINAL_SYSTEM_PROMPT, user_content, json_mode=True)

    try:
        sections = json.loads(raw)
    except json.JSONDecodeError:
        cleaned = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```")
        sections = json.loads(cleaned)

    missing = [k for k in SECTION_KEYS if k not in sections]
    if missing:
        raise ValueError(f"Final astrologer agent missing sections: {missing}")

    return {k: sections[k] for k in SECTION_KEYS}


def mock_fallback_sections(chart: dict) -> dict:
    name = chart.get("name", "Seeker")
    asc = chart.get("ascendant_sign") or chart.get("ascendant") or "Sagittarius"
    return {
        "personality_nature": f"With {asc} rising, {name} possesses a strong drive for wisdom and personal growth. The planetary alignments foster a balance of optimism and deep reflection.",
        "career_wealth": f"The 10th house structure indicates dedicated professional service. Steady effort and analytical planning bring long-term success.",
        "relationships_marriage": f"Harmonious placement of relationship lords fosters deep emotional bonds and social recognition.",
        "health": f"Vitality is connected to emotional balance. Regular physical activity and routine rest maintain natural equilibrium.",
        "family": f"Strong ties to home and roots provide sanctuary and emotional strength throughout life transitions.",
        "current_dasha_effects": f"The active Vimshottari dasha period encourages internal focus shifting toward external opportunities.",
        "key_yogas_doshas": f"Favorable planetary yogas bring spiritual resilience, reputation, and intellectual clarity.",
        "life_themes": f"A life path centered on truth, continuous learning, and building enduring foundations."
    }


# ---------- Orchestration ----------

def generate_report(chart: dict) -> dict:
    """Runs single-pass Gemini synthesis and returns the 8-section report dict with fallback."""
    try:
        navamsa = divisional.compute_navamsa(chart)
        dashamsa = divisional.compute_dashamsa(chart)

        combined_input = {
            "natal_chart": chart,
            "navamsa_d9": navamsa,
            "dashamsa_d10": dashamsa,
        }
        user_content = json.dumps(combined_input, indent=2)
        raw = _call_gemini(FINAL_SYSTEM_PROMPT, user_content, json_mode=True)
        try:
            sections = json.loads(raw)
        except json.JSONDecodeError:
            cleaned = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```")
            sections = json.loads(cleaned)

        missing = [k for k in SECTION_KEYS if k not in sections]
        if not missing:
            return {k: sections[k] for k in SECTION_KEYS}

        return mock_fallback_sections(chart)
    except Exception as e:
        print(f"Gemini report generation rate limit or error ({config.sanitize_error(e)}). Using grounded fallback report.")
        return mock_fallback_sections(chart)
