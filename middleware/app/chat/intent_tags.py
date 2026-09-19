"""
Free, local, no-AI-call topic tagging — used ONLY for the "section_used"
analytics field the UI displays. This must NEVER be used to restrict what
context the AI sees (that was the original bug — see chat_handler.py's old
version in git history for what not to do again).
"""

INTENT_KEYWORDS = {
    "career": ["career", "job", "promotion", "business", "profession", "money", "finance", "wealth"],
    "relationships": ["relationship", "marriage", "married", "marry", "partner", "love", "spouse",
                       "divorce", "romance"],
    "health": ["health", "illness", "sick", "disease", "body", "energy", "wellbeing", "fitness"],
    "family": ["family", "parents", "mother", "father", "children", "kids", "sibling"],
    "current_period": ["dasha", "period", "transit", "right now", "these days", "currently", "phase"],
    "doshas_remedies": ["dosha", "yoga", "remedy", "manglik", "kaal sarp", "curse", "affliction"],
    "personality": ["personality", "nature", "who am i", "character", "trait", "strength", "weakness"],
    "general_knowledge": ["what is", "what does", "explain", "meaning of", "define"],
}


def tag_intent(message: str) -> str:
    msg = message.lower()
    for intent, keywords in INTENT_KEYWORDS.items():
        if any(kw in msg for kw in keywords):
            return intent
    return "open_ended"  # legitimately anything — small talk, off-topic, unclear; not an error state
