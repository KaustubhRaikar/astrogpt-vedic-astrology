"""
Direct factual lookups about the user's NATAL (birth) chart — the fixed
placements calculated once at chart generation. Zero AI calls: these are
plain data lookups, not interpretation, so there's no reason to spend one.

For CURRENT/live planetary positions ("where is Rahu right now"), see
transit.py instead.

IMPORTANT (fixed after a lesson from SkillAI's chat NLP work): a placement
keyword like "position" also appears in genuinely interpretive questions —
"what does the position of Jupiter mean for my career" contains "jupiter"
and "position" but is NOT a factual lookup; it needs real interpretation.
INTERPRETIVE_MARKERS below excludes these so they fall through to the AI
layer instead of getting a bare, out-of-context factual answer.
"""
import re

PLANET_NAMES = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn", "rahu", "ketu"]
PLACEMENT_KEYWORDS = ["sign", "house", "nakshatra", "where", "placed", "position", "retrograde"]

# If any of these appear, the question wants MEANING/INTERPRETATION, not a
# bare fact — always defer to the AI layer regardless of placement keywords.
INTERPRETIVE_MARKERS = [
    "mean", "meaning", "why", "how does", "how will", "affect", "impact",
    "significance", "significant", "represent", "influence", "effect on",
    "good or bad", "should i", "explain",
]


def try_natal_lookup(message: str, chart: dict) -> str | None:
    msg = message.lower()

    if any(marker in msg for marker in INTERPRETIVE_MARKERS):
        return None  # let the AI layer handle it — this wants interpretation

    for planet in PLANET_NAMES:
        if planet in msg and any(kw in msg for kw in PLACEMENT_KEYWORDS):
            match = next((p for p in chart["planets"] if p["planet"].lower() == planet), None)
            if match:
                retro = ", and it's currently retrograde" if match["retrograde"] else ""
                return (f"In your birth chart, {match['planet']} is in {match['sign']}, "
                        f"in your {match['house']}th house, sitting in {match['nakshatra']} "
                        f"nakshatra{retro}.")

    if re.search(r"\b(ascendant|lagna|rising sign)\b", msg):
        return (f"Your ascendant is {chart['ascendant_sign']}, at "
                f"{chart['ascendant_degree']:.1f} degrees.")

    if re.search(r"\b(current dasha|which dasha|what dasha|current period|"
                 r"what period am i in)\b", msg):
        d = chart["current_dasha"]
        return f"You're currently running your {d['lord']} Dasha, until {d['end']}."

    return None
