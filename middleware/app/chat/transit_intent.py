"""
Decides whether a placement-style question ("where is Rahu", "what sign is
Saturn in") is asking about the natal chart (birth-time, fixed) or a live
transit (right now, changes daily). This distinction matters because they
need completely different data sources — get it wrong and you either answer
a "right now" question with 30-year-old birth data, or vice versa.
"""
import re

PLANET_NAMES = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn", "rahu", "ketu"]

TRANSIT_MARKERS = [
    "right now", "currently", "today", "these days", "at the moment",
    "presently", "now", "this week", "this month",
]

PLACEMENT_MARKERS = ["sign", "house", "nakshatra", "where", "placed", "position", "place", "retrograde"]


def extract_transit_query(message: str) -> str | None:
    """Returns the planet name (capitalized, e.g. 'Rahu') if this looks like
    a current-transit question, else None."""
    msg = message.lower()

    has_planet = any(p in msg for p in PLANET_NAMES)
    has_placement_word = any(m in msg for m in PLACEMENT_MARKERS)
    has_transit_marker = any(m in msg for m in TRANSIT_MARKERS)

    if not (has_planet and has_placement_word and has_transit_marker):
        return None

    for planet in PLANET_NAMES:
        if planet in msg:
            return planet.capitalize()
    return None
