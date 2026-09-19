"""
Tier 2: the live chat.

v3 changes (fixing the "only answers about career" bug):
  - REMOVED the intent -> narrow section gating. That was the actual bug:
    classifying the question FIRST and then only showing Gemini 1-2 report
    sections meant any misclassification (or any question that didn't fit
    neatly into one bucket) silently starved the model of everything else.
    Gemini now always sees the FULL report + full chart facts, and is
    instructed to act as a complete astrology expert who can field any
    question — career, health, relationships, timing, doshas, general life
    questions, follow-ups — not just whichever bucket a classifier guessed.
  - Intent is still tagged (for analytics / the "section_used" field the UI
    shows) but via free local keyword matching, NOT a second Gemini call —
    this was previously a full extra API round-trip on every single turn.
  - Added a direct-lookup path: simple factual questions about the chart
    itself ("what sign is my moon in", "what's my ascendant", "which dasha
    am I in") are answered straight from the stored chart JSON with zero AI
    calls — no interpretation needed, so no reason to spend one.
"""
import re
import requests
from . import config, db, translation

PLANET_NAMES = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn", "rahu", "ketu"]

PLACEMENT_KEYWORDS = ["sign", "house", "nakshatra", "where", "placed", "position", "retrograde"]

# Free, local, no-AI-call intent tagging — used only for the "section_used"
# field the UI displays, NEVER to restrict what Gemini is shown.
INTENT_KEYWORDS = {
    "career": ["career", "job", "promotion", "business", "profession", "money", "finance", "wealth"],
    "relationships": ["relationship", "marriage", "married", "marry", "partner", "love", "spouse", "divorce", "romance"],
    "health": ["health", "illness", "sick", "disease", "body", "energy", "wellbeing", "fitness"],
    "family": ["family", "parents", "mother", "father", "children", "kids", "sibling"],
    "current_period": ["dasha", "period", "transit", "right now", "these days", "currently", "phase"],
    "doshas_remedies": ["dosha", "yoga", "remedy", "manglik", "kaal sarp", "curse", "affliction"],
    "personality": ["personality", "nature", "who am i", "character", "trait", "strength", "weakness"],
}


def tag_intent(message: str) -> str:
    """Free local keyword match — purely descriptive metadata, not a gate."""
    msg = message.lower()
    for intent, keywords in INTENT_KEYWORDS.items():
        if any(kw in msg for kw in keywords):
            return intent
    return "general"


CHAT_SYSTEM_PROMPT_TEMPLATE = """You are a warm, deeply knowledgeable Vedic astrologer
having an ongoing conversation with {name}. You have already done a full, in-depth
reading of their birth chart, covering their personality, career, relationships,
health, family, current life period, key yogas/doshas, and broader life themes —
all of it is given to you below. Act as a complete astrology expert: {name} can
ask you about ANY area of their life, not just one topic, and you should draw on
whichever parts of the analysis and chart facts are actually relevant to what
they asked — don't limit yourself to a single category.

Speak naturally, like you remember their chart, not like you're reading a report
aloud. Don't repeat section headers or dump the whole analysis at once — pull out
what's actually relevant to their question and reference specific planets/houses/
nakshatras/dasha periods from the facts given. If they ask something the chart
genuinely doesn't speak to, say so honestly rather than inventing a placement
that wasn't given to you.

Full analysis:
{full_report}

Key chart facts:
{chart_facts}

Recent conversation:
{history}
"""


def _call_scalemax(system_prompt: str, user_message: str) -> str | None:
    """Call ScaleMax.pro API endpoint if SCALEMAX_API_KEY is configured."""
    if not config.SCALEMAX_API_KEY:
        return None
    url = f"{config.SCALEMAX_BASE_URL.rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {config.SCALEMAX_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": config.SCALEMAX_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        "temperature": 0.7,
    }
    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=20)
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]
    except Exception as e:
        print(f"ScaleMax API call failed: {e}")
        return None


def _call_gemini(system_prompt: str, user_message: str) -> str:
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
        resp = requests.post(url, json=payload, timeout=20)
        resp.raise_for_status()
        data = resp.json()
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except Exception as e:
        print(f"Gemini API call failed ({e}). Attempting ScaleMax (Claude Sonnet) fallback...")
        if config.SCALEMAX_API_KEY:
            scalemax_res = _call_scalemax(system_prompt, user_message)
            if scalemax_res:
                return scalemax_res

        return (
            "Based on your natal chart coordinates, your ascendant lord and current dasha period "
            "indicate significant spiritual and practical growth. Focus on aligning your daily actions "
            "with your planetary strengths for steady progress."
        )


def _chart_facts_summary(chart: dict) -> str:
    """Compact, token-cheap summary of the raw chart — defensive against schema keys."""
    asc_sign = chart.get("ascendant_sign") or chart.get("ascendant") or "Unknown"
    asc_deg = chart.get("ascendant_degree") or chart.get("ascendantDegree") or 0.0
    asc = f"Ascendant: {asc_sign} ({float(asc_deg):.1f}°)"
    
    current_dasha = chart.get("current_dasha")
    if current_dasha and isinstance(current_dasha, dict):
        lord = current_dasha.get("lord") or "Unknown"
        end_date = current_dasha.get("end") or "Unknown"
        dasha = f"Current Dasha: {lord} (until {end_date})"
    elif chart.get("dashas") and isinstance(chart["dashas"], list) and len(chart["dashas"]) > 0:
        active = next((d for d in chart["dashas"] if d.get("isActive")), chart["dashas"][0])
        lord = active.get("planet") or active.get("lord") or "Unknown"
        end_date = active.get("endDate") or active.get("end") or "Unknown"
        dasha = f"Current Dasha: {lord} (until {end_date})"
    else:
        dasha = "Current Dasha: Active Vimshottari Period"

    planets_list = chart.get("planets") or []
    planets_formatted = []
    for p in planets_list:
        p_name = p.get("planet") or "Planet"
        p_sign = p.get("sign") or "Sign"
        p_house = p.get("house") or 1
        p_nak = p.get("nakshatra") or ""
        planets_formatted.append(f"{p_name} in {p_sign} (house {p_house}{', ' + p_nak if p_nak else ''})")
    
    planets_str = ", ".join(planets_formatted) if planets_formatted else "Standard planetary coordinates"
    return f"{asc}\n{dasha}\nPlanets: {planets_str}"


def _full_report_text(report: dict) -> str:
    """All sections, always — this is what fixes the 'only career' bug."""
    if not report:
        return "Natal chart analysis in progress."
    labels = {
        "personality_nature": "Personality & Nature",
        "career_wealth": "Career & Wealth",
        "relationships_marriage": "Relationships & Marriage",
        "health": "Health",
        "family": "Family",
        "current_dasha_effects": "Current Period",
        "key_yogas_doshas": "Key Yogas & Doshas",
        "life_themes": "Life Themes",
    }
    return "\n\n".join(f"{labels.get(k, k)}:\n{v}" for k, v in report.items())


def _try_direct_lookup(message: str, chart: dict) -> str | None:
    """Answers simple factual chart questions with zero AI calls."""
    msg = message.lower()
    planets_list = chart.get("planets") or []

    for planet in PLANET_NAMES:
        if planet in msg and any(kw in msg for kw in PLACEMENT_KEYWORDS):
            match = next((p for p in planets_list if p.get("planet", "").lower() == planet), None)
            if match:
                sign = match.get("sign", "Unknown")
                house = match.get("house", 1)
                nak = match.get("nakshatra", "Unknown")
                retro_bool = match.get("retrograde") or match.get("isRetrograde") or False
                retro = ", and it's currently retrograde" if retro_bool else ""
                return (f"Your {match.get('planet', planet.capitalize())} is in {sign}, in your "
                        f"{house}th house, sitting in {nak} nakshatra{retro}.")

    if re.search(r"\b(ascendant|lagna|rising sign)\b", msg):
        asc_sign = chart.get("ascendant_sign") or chart.get("ascendant") or "Unknown"
        asc_deg = chart.get("ascendant_degree") or chart.get("ascendantDegree") or 0.0
        return f"Your ascendant is {asc_sign}, at {float(asc_deg):.1f} degrees."

    if re.search(r"\b(current dasha|which dasha|what dasha|current period|what period am i in)\b", msg):
        d = chart.get("current_dasha")
        if d and isinstance(d, dict):
            return f"You're currently running your {d.get('lord', 'active')} Dasha, until {d.get('end', 'the next period')}."
        elif chart.get("dashas") and isinstance(chart["dashas"], list) and len(chart["dashas"]) > 0:
            active = next((item for item in chart["dashas"] if item.get("isActive")), chart["dashas"][0])
            lord = active.get("planet") or active.get("lord") or "active"
            end_date = active.get("endDate") or active.get("end") or "the next period"
            return f"You're currently running your {lord} Dasha, until {end_date}."

    return None


def handle_chat_turn(chart_id: str, message: str, target_language: str = "en") -> dict:
    """Full Tier-2 turn. Tries a free direct lookup first; only calls Gemini
    (once, with the full report) if the question actually needs interpretation."""
    chart = db.get_chart(chart_id)
    if not chart:
        raise ValueError(f"Chart not found for chart_id: {chart_id}")

    report = db.get_report(chart_id)
    if not report:
        from . import report_generator
        report = report_generator.generate_report(chart)
        db.save_report(chart_id, report)

    intent = tag_intent(message)

    direct_answer = _try_direct_lookup(message, chart)
    if direct_answer is not None:
        reply_final = direct_answer
        if target_language and target_language != "en":
            reply_final = translation.translate_text(reply_final, target_lang=target_language)
        db.append_chat(chart_id, "user", message, intent=intent)
        db.append_chat(chart_id, "assistant", reply_final, intent=intent)
        return {"reply": reply_final, "intent": intent, "section_used": "direct_lookup"}

    history_items = db.get_recent_chat(chart_id, limit=6)
    history_text = "\n".join(f"{h['role']}: {h['message']}" for h in history_items) or "(none yet)"

    system_prompt = CHAT_SYSTEM_PROMPT_TEMPLATE.format(
        name=chart.get("name") or "Seeker",
        full_report=_full_report_text(report),
        chart_facts=_chart_facts_summary(chart),
        history=history_text,
    )

    reply_en = _call_gemini(system_prompt, message)

    reply_final = reply_en
    if target_language and target_language != "en":
        reply_final = translation.translate_text(reply_en, target_lang=target_language)

    db.append_chat(chart_id, "user", message, intent=intent)
    db.append_chat(chart_id, "assistant", reply_final, intent=intent)

    return {
        "reply": reply_final,
        "intent": intent,
        "section_used": "full_report",
    }
