"""
Lucky numbers, colors, and gemstones — deterministic lookup tables, no AI,
no new calculation needed: this reuses the Life Path number already computed
by numerology_engine.py and the Ascendant already computed by chart_engine.py.

FRAMING, stated deliberately: gemstone associations are presented as
"traditional association," never as medical, financial, or guaranteed-
outcome advice — gemstones are commercially sold, so this must not read as
a purchase recommendation or a claim of effect. This mirrors the
RESPONSE_RULES discipline used throughout the rest of the app, just baked
into the data layer instead of an AI prompt.

SIMPLIFICATION: gemstone is derived from the Ascendant's ruling planet —
NOT from assessing which planet is "weak" or afflicted in the chart. Real
gemstone recommendation in classical practice depends on a proper strength
assessment (Shadbala and related techniques) that isn't implemented here;
doing that properly is a separate, larger feature, not something to fake
with a simpler rule and present as equivalent.
"""

# Planet ruling each sign (classical/traditional rulerships, not modern
# outer-planet rulerships, for consistency with Rahu/Ketu already used
# elsewhere in this app).
SIGN_RULER = {
    "Aries": "Mars", "Taurus": "Venus", "Gemini": "Mercury", "Cancer": "Moon",
    "Leo": "Sun", "Virgo": "Mercury", "Libra": "Venus", "Scorpio": "Mars",
    "Sagittarius": "Jupiter", "Capricorn": "Saturn", "Aquarius": "Saturn",
    "Pisces": "Jupiter",
}

PLANET_GEMSTONE = {
    "Sun": "Ruby", "Moon": "Pearl", "Mars": "Red Coral", "Mercury": "Emerald",
    "Jupiter": "Yellow Sapphire", "Venus": "Diamond (or white sapphire)",
    "Saturn": "Blue Sapphire", "Rahu": "Hessonite", "Ketu": "Cat's Eye",
}

PLANET_COLOR = {
    "Sun": "Orange/Gold", "Moon": "White/Silver", "Mars": "Red",
    "Mercury": "Green", "Jupiter": "Yellow", "Venus": "Pastel/White",
    "Saturn": "Dark Blue/Black", "Rahu": "Smoky/Grey", "Ketu": "Multicolor",
}

# Traditional "friendly" numbers for each Life Path/root number (1-9),
# commonly used for lucky-number guidance alongside the number itself.
FRIENDLY_NUMBERS = {
    1: [1, 2, 9], 2: [1, 2, 7], 3: [3, 6, 9], 4: [4, 5, 8], 5: [4, 5, 6],
    6: [3, 6, 9], 7: [2, 7, 5], 8: [4, 8, 9], 9: [3, 6, 9],
    11: [1, 2, 9], 22: [4, 5, 8], 33: [3, 6, 9],  # master numbers inherit their root's affinities
}


def _root(n: int) -> int:
    """Master numbers (11/22/33) map to their lookup-table root for the
    friendly-numbers table, which doesn't have separate master-number rows
    beyond what's already listed above."""
    return n if n in FRIENDLY_NUMBERS else n


def get_lucky_profile(life_path_number: int, ascendant_sign: str) -> dict:
    ruler = SIGN_RULER.get(ascendant_sign)
    friendly = FRIENDLY_NUMBERS.get(life_path_number, [life_path_number])

    return {
        "lucky_numbers": friendly,
        "lucky_color": PLANET_COLOR.get(ruler, "Unknown"),
        "gemstone": {
            "stone": PLANET_GEMSTONE.get(ruler, "Unknown"),
            "basis": f"Ruling planet of your Ascendant ({ascendant_sign} → {ruler})",
            "note": ("Traditional association, not medical or financial advice. "
                     "This is based on your Ascendant's ruling planet only — a full "
                     "gemstone recommendation traditionally requires assessing planetary "
                     "strength across the whole chart, which this simplified lookup does not do."),
        },
    }
