"""
Entry point for a chat turn. Routing order:
  1. Transit question? ("where is Rahu right now") -> transit.py, no AI call
  2. Natal placement question? ("what sign is my moon in") -> natal_lookup.py, no AI call
  3. Anything else at all -> ai_responder.py (Gemini), fully grounded + free to
     answer general knowledge, interpretation, or genuinely open-ended chat

This is the "let AI answer if the deterministic layers don't have it"
principle: steps 1-2 only fire on a confident, narrow match; everything else
— which is most messages, since people ask literally anything — reaches the
AI rather than dead-ending.
"""
from app import db, translation
from . import natal_lookup, transit, transit_intent, intent_tags, ai_responder

HISTORY_TURNS = 12  # was 6 — a short window is part of why chat felt disjointed


def _chart_facts_summary(chart: dict) -> str:
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
    if not report:
        return "Natal chart analysis in progress."
    labels = {
        "personality_nature": "Personality & Nature", "career_wealth": "Career & Wealth",
        "relationships_marriage": "Relationships & Marriage", "health": "Health",
        "family": "Family", "current_dasha_effects": "Current Period",
        "key_yogas_doshas": "Key Yogas & Doshas", "life_themes": "Life Themes",
    }
    return "\n\n".join(f"{labels.get(k, k)}:\n{v}" for k, v in report.items())


def handle_chat_turn(chart_id: str, message: str, target_language: str = "en") -> dict:
    chart = db.get_chart(chart_id)
    if not chart:
        raise ValueError(f"Chart not found for chart_id: {chart_id}")

    report = db.get_report(chart_id)
    if not report:
        from .. import report_generator
        report = report_generator.generate_report(chart)
        db.save_report(chart_id, report)

    intent = intent_tags.tag_intent(message)

    # --- Step 1: current transit question ---
    transit_planet = transit_intent.extract_transit_query(message)
    if transit_planet:
        # ascendant sign index isn't stored directly on the chart dict as a
        # number — derive it from ascendant_sign name via chart_engine's SIGNS list
        from .. import chart_engine
        asc_sign_num = chart_engine.SIGNS.index(chart["ascendant_sign"])
        t = transit.get_current_transit(transit_planet, asc_sign_num)
        if t:
            retro = ", and it's retrograde right now" if t["retrograde"] else ""
            reply = (f"Right now, {t['planet']} is transiting {t['sign']}, which falls in "
                     f"your {t['house']}th house{retro}. (As of {t['as_of']}.)")
            db.append_chat(chart_id, "user", message, intent="current_period")
            db.append_chat(chart_id, "assistant", reply, intent="current_period")
            reply_final = reply
            if target_language and target_language != "en":
                reply_final = translation.translate_text(reply, target_lang=target_language)
            return {"reply": reply_final, "intent": "current_period", "section_used": "transit_lookup"}

    # --- Step 2: natal placement question ---
    natal_answer = natal_lookup.try_natal_lookup(message, chart)
    if natal_answer is not None:
        db.append_chat(chart_id, "user", message, intent=intent)
        db.append_chat(chart_id, "assistant", natal_answer, intent=intent)
        reply_final = natal_answer
        if target_language and target_language != "en":
            reply_final = translation.translate_text(natal_answer, target_lang=target_language)
        return {"reply": reply_final, "intent": intent, "section_used": "natal_lookup"}

    # --- Step 3: everything else -> AI, fully grounded, never dead-ends ---
    history_items = db.get_recent_chat(chart_id, limit=HISTORY_TURNS)
    history_text = "\n".join(f"{h['role']}: {h['message']}" for h in history_items) or "(none yet)"

    system_prompt = ai_responder.build_system_prompt(
        name=chart["name"],
        full_report=_full_report_text(report),
        chart_facts=_chart_facts_summary(chart),
        history=history_text,
    )
    reply_en = ai_responder.call_gemini(system_prompt, message)

    reply_final = reply_en
    if target_language and target_language != "en":
        reply_final = translation.translate_text(reply_en, target_lang=target_language)

    db.append_chat(chart_id, "user", message, intent=intent)
    db.append_chat(chart_id, "assistant", reply_final, intent=intent)

    return {"reply": reply_final, "intent": intent, "section_used": "ai_full_context"}
