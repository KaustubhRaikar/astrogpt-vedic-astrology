"""
Traditional Namakaran (naming) syllable lookup — which starting sound a
baby's name should begin with, based on the Moon's nakshatra+pada at birth.
Deterministic, no AI, no new calculation: the chart already stores the
Moon's nakshatra and pada (computed once, at chart generation) — this is
purely a 108-row lookup table against data you already have.

SOURCE CONFIDENCE NOTE: cross-checked against 4+ independent sources.
Most rows agreed exactly (transliteration spelling varies harmlessly,
e.g. "Ti" vs "Tee" — same sound). One real discrepancy was found and
resolved: Vishakha's pada order differed between two sources; the order
here follows DrikPanchang (a well-established dedicated Panchang
reference) over the other. Purva Ashadha, Mula, and Uttara Bhadrapada had
only single-source confirmation in the search — lower (but not zero)
confidence on those three specifically.
"""
from .chart_engine import NAKSHATRAS

PADA_SYLLABLES = {
    "Ashwini": ["Chu", "Che", "Cho", "La"],
    "Bharani": ["Li", "Lu", "Le", "Lo"],
    "Krittika": ["A", "I", "U", "E"],
    "Rohini": ["O", "Va", "Vi", "Vu"],
    "Mrigashira": ["Ve", "Vo", "Ka", "Ki"],
    "Ardra": ["Ku", "Gha", "Na", "Chha"],
    "Punarvasu": ["Ke", "Ko", "Ha", "Hi"],
    "Pushya": ["Hu", "He", "Ho", "Da"],
    "Ashlesha": ["Di", "Du", "De", "Do"],
    "Magha": ["Ma", "Mi", "Mu", "Me"],
    "Purva Phalguni": ["Mo", "Ta", "Ti", "Tu"],
    "Uttara Phalguni": ["Te", "To", "Pa", "Pi"],
    "Hasta": ["Pu", "Sha", "Na", "Tha"],
    "Chitra": ["Pe", "Po", "Ra", "Re"],
    "Swati": ["Ru", "Re", "Ro", "Ta"],
    "Vishakha": ["Ti", "Tu", "Te", "To"],
    "Anuradha": ["Na", "Ni", "Nu", "Ne"],
    "Jyeshtha": ["No", "Ya", "Yi", "Yu"],
    "Mula": ["Ye", "Yo", "Ba", "Bi"],
    "Purva Ashadha": ["Bu", "Dha", "Bha", "Pha"],
    "Uttara Ashadha": ["Bhe", "Bho", "Ja", "Ji"],
    "Shravana": ["Khi", "Khu", "Khe", "Kho"],
    "Dhanishta": ["Ga", "Gi", "Gu", "Ge"],
    "Shatabhisha": ["Go", "Sa", "Si", "Su"],
    "Purva Bhadrapada": ["Se", "So", "Da", "Di"],
    "Uttara Bhadrapada": ["Du", "Tha", "Jha", "Na"],
    "Revati": ["De", "Do", "Cha", "Chi"],
}


def get_naming_syllable(nakshatra: str, pada: int) -> str:
    if nakshatra not in PADA_SYLLABLES:
        raise ValueError(f"Unknown nakshatra: {nakshatra}")
    if pada not in (1, 2, 3, 4):
        raise ValueError(f"Pada must be 1-4, got {pada}")
    return PADA_SYLLABLES[nakshatra][pada - 1]


def get_naming_syllable_from_chart(chart: dict) -> dict:
    """Pulls the Moon's nakshatra+pada straight from an already-generated
    chart — no new calculation needed."""
    moon = next((p for p in chart["planets"] if p["planet"] == "Moon"), None)
    if not moon:
        raise ValueError("Chart has no Moon placement")
    syllable = get_naming_syllable(moon["nakshatra"], moon["nakshatra_pada"])
    return {
        "nakshatra": moon["nakshatra"],
        "pada": moon["nakshatra_pada"],
        "syllable": syllable,
    }
