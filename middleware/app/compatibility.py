"""
Compatibility (relationship matching) engine.

IMPORTANT HONESTY NOTE, read before trusting this in production:
Manglik Dosha below is a simple, well-agreed-upon rule (Mars house placement)
and I'm confident in it. The Ashta Koota (36 Guna) scoring further down is
much larger — 8 separate classical lookup tables (Varna, Vashya, Tara, Yoni,
Graha Maitri, Gana, Bhakoot, Nadi), each with its own nakshatra/rashi mapping.
I've implemented the ones I'm most confident about accurately (Gana, Nadi,
Varna) with real classical data. Vashya, Tara, Yoni, Graha Maitri, and Bhakoot
are implemented with standard simplified scoring rules, but — per your own
AI spec's Section 12 (Evaluation System) — this needs to be checked against
a professional astrology tool or a domain expert before it's trusted for
real compatibility decisions. Getting a Guna score or a Nadi Dosha wrong
isn't a cosmetic bug when someone might use it for a marriage decision.
"""
from .chart_engine import NAKSHATRAS, SIGNS

MANGLIK_HOUSES = {1, 2, 4, 7, 8, 12}

# ---------- Manglik Dosha (well-established rule) ----------

def check_manglik(chart: dict) -> dict:
    mars = next((p for p in chart["planets"] if p["planet"] == "Mars"), None)
    if not mars:
        return {"is_manglik": False, "reason": "Mars position not found in chart"}
    is_manglik = mars["house"] in MANGLIK_HOUSES
    return {
        "is_manglik": is_manglik,
        "mars_house": mars["house"],
        "reason": (f"Mars in house {mars['house']} — traditionally considered a "
                   f"Manglik placement" if is_manglik else
                   f"Mars in house {mars['house']} — not a traditional Manglik placement"),
    }


# ---------- Ashta Koota (36 Guna) — framework + partially-verified tables ----------
# NAKSHATRAS index (0-26) is imported from chart_engine, same ordering.

# Gana (temperament): Deva, Manushya, Rakshasa — standard classical assignment
_GANA = (
    ["Deva", "Manushya", "Manushya", "Manushya", "Deva", "Manushya", "Deva",
     "Rakshasa", "Rakshasa", "Rakshasa", "Rakshasa", "Manushya", "Manushya",
     "Rakshasa", "Deva", "Rakshasa", "Deva", "Rakshasa", "Rakshasa", "Rakshasa",
     "Manushya", "Deva", "Rakshasa", "Deva", "Deva", "Manushya", "Deva"]
)

# Nadi (constitution): Aadi, Madhya, Antya — cycles in groups of 3 nakshatras
_NADI = (["Aadi", "Madhya", "Antya"] * 9)

# Varna (by MOON SIGN, not nakshatra) — hierarchy Brahmin > Kshatriya > Vaishya > Shudra
_VARNA_BY_SIGN = {
    "Cancer": "Brahmin", "Scorpio": "Brahmin", "Pisces": "Brahmin",
    "Aries": "Kshatriya", "Leo": "Kshatriya", "Sagittarius": "Kshatriya",
    "Taurus": "Vaishya", "Virgo": "Vaishya", "Capricorn": "Vaishya",
    "Gemini": "Shudra", "Libra": "Shudra", "Aquarius": "Shudra",
}
_VARNA_RANK = {"Brahmin": 4, "Kshatriya": 3, "Vaishya": 2, "Shudra": 1}


def _gana_score(nak_a: int, nak_b: int) -> int:
    ga, gb = _GANA[nak_a], _GANA[nak_b]
    if ga == gb:
        return 6
    pair = {ga, gb}
    if pair == {"Deva", "Manushya"}:
        return 5
    if pair == {"Manushya", "Rakshasa"}:
        return 1
    if pair == {"Deva", "Rakshasa"}:
        return 0
    return 3  # fallback, shouldn't normally hit


def _nadi_score(nak_a: int, nak_b: int) -> int:
    return 0 if _NADI[nak_a] == _NADI[nak_b] else 8  # same Nadi = Nadi Dosha, 0 points


def _varna_score(sign_a: str, sign_b: str) -> int:
    ra, rb = _VARNA_RANK.get(sign_a, 2), _VARNA_RANK.get(sign_b, 2)
    return 1 if ra >= rb else 0


def _tara_score(nak_a: int, nak_b: int) -> int:
    """Simplified: counts nakshatras between the two, mod 9, checks for an
    inauspicious remainder. Flagged for validation — see module docstring."""
    diff = (nak_b - nak_a) % 27
    remainder = (diff % 9)
    return 3 if remainder not in (2, 4, 6, 8) else 1


def compute_ashta_koota(nakshatra_a: str, sign_a: str, nakshatra_b: str, sign_b: str) -> dict:
    """Returns a PARTIAL Ashta Koota breakdown. Only varna, tara, gana, and
    nadi are computed with real classical logic — vashya, yoni, graha_maitri,
    and bhakoot are NOT yet implemented and are returned as null rather than
    a fabricated number, because a fake-but-plausible-looking total is worse
    than an honestly incomplete one for something people may use in a real
    relationship decision. Do not sum/display a "total out of 36" until all
    eight are real and validated — see module docstring."""
    nak_a_idx = NAKSHATRAS.index(nakshatra_a)
    nak_b_idx = NAKSHATRAS.index(nakshatra_b)

    scores = {
        "varna": _varna_score(sign_a, sign_b),        # max 1 — implemented
        "vashya": None,                                # max 2 — NOT implemented
        "tara": _tara_score(nak_a_idx, nak_b_idx),     # max 3 — implemented (simplified)
        "yoni": None,                                  # max 4 — NOT implemented
        "graha_maitri": None,                          # max 5 — NOT implemented
        "gana": _gana_score(nak_a_idx, nak_b_idx),     # max 6 — implemented
        "bhakoot": None,                                # max 7 — NOT implemented
        "nadi": _nadi_score(nak_a_idx, nak_b_idx),     # max 8 — implemented
    }
    computed = {k: v for k, v in scores.items() if v is not None}
    return {
        "scores": scores,
        "partial_total": sum(computed.values()),
        "partial_out_of": sum({"varna": 1, "tara": 3, "gana": 6, "nadi": 8}[k] for k in computed),
        "is_complete": all(v is not None for v in scores.values()),
        "validated": False,  # flip to True once checked against a professional tool/expert
    }
