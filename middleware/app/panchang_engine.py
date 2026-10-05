"""
Panchang ("five limbs" of the Vedic calendar day) — deterministic, pure
astronomical math, no AI. Same discipline as chart_engine.py: this computes
Tithi, Vara, Nakshatra, Yoga, and Karana for a GIVEN DATE (not a birth date —
this is "what day is it, astrologically" rather than "what was the sky like
when someone was born").

ADDITIVE: imports chart_engine for the Nakshatra lookup (reusing the exact
same 27-nakshatra logic already built and tested) and swisseph directly for
the sun/moon longitudes needed for Tithi/Yoga/Karana — doesn't modify
chart_engine.py itself.
"""
import swisseph as swe
from datetime import datetime, timezone
from .chart_engine import NAKSHATRAS, _nakshatra

TITHI_NAMES = [
    "Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami", "Shashthi",
    "Saptami", "Ashtami", "Navami", "Dashami", "Ekadashi", "Dwadashi",
    "Trayodashi", "Chaturdashi",
]  # 14 names; 15th is Purnima (full moon) or Amavasya (new moon) depending on paksha

VARA_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
# Python's datetime.weekday(): Monday=0 ... Sunday=6 — matches VARA_NAMES index directly

YOGA_NAMES = [
    "Vishkambha", "Priti", "Ayushman", "Saubhagya", "Shobhana", "Atiganda",
    "Sukarma", "Dhriti", "Shoola", "Ganda", "Vriddhi", "Dhruva", "Vyaghata",
    "Harshana", "Vajra", "Siddhi", "Vyatipata", "Variyana", "Parigha", "Shiva",
    "Siddha", "Sadhya", "Shubha", "Shukla", "Brahma", "Indra", "Vaidhriti",
]

KARANA_MOVABLE = ["Bava", "Balava", "Kaulava", "Taitila", "Garija", "Vanija", "Vishti"]
KARANA_FIXED_FIRST = "Kimstughna"  # always karana #1 of the lunar month
KARANA_FIXED_LAST = ["Shakuni", "Chatushpada", "Naga"]  # always karanas #58, 59, 60


def _sidereal_longitudes(dt_utc: datetime) -> tuple[float, float]:
    swe.set_sid_mode(swe.SIDM_LAHIRI)
    jd_ut = swe.julday(dt_utc.year, dt_utc.month, dt_utc.day,
                        dt_utc.hour + dt_utc.minute / 60)
    sun_pos, _ = swe.calc_ut(jd_ut, swe.SUN, swe.FLG_SIDEREAL)
    moon_pos, _ = swe.calc_ut(jd_ut, swe.MOON, swe.FLG_SIDEREAL)
    return sun_pos[0], moon_pos[0]


def compute_tithi(sun_lon: float, moon_lon: float) -> dict:
    diff = (moon_lon - sun_lon) % 360
    tithi_num = int(diff // 12) + 1  # 1-30
    paksha = "Shukla" if tithi_num <= 15 else "Krishna"
    position_in_paksha = ((tithi_num - 1) % 15) + 1  # 1-15
    if position_in_paksha == 15:
        name = "Purnima" if paksha == "Shukla" else "Amavasya"
    else:
        name = TITHI_NAMES[position_in_paksha - 1]
    return {"number": tithi_num, "paksha": paksha, "name": name}


def compute_yoga(sun_lon: float, moon_lon: float) -> str:
    total = (sun_lon + moon_lon) % 360
    idx = int(total // (360 / 27))
    return YOGA_NAMES[idx]


def compute_karana(sun_lon: float, moon_lon: float) -> str:
    diff = (moon_lon - sun_lon) % 360
    karana_num = int(diff // 6) + 1  # 1-60 half-tithis across the lunar month
    if karana_num == 1:
        return KARANA_FIXED_FIRST
    if karana_num >= 58:
        return KARANA_FIXED_LAST[karana_num - 58]
    return KARANA_MOVABLE[(karana_num - 2) % 7]


def compute_panchang(date_utc: datetime | None = None) -> dict:
    """date_utc defaults to now. Returns Tithi, Vara (weekday), Nakshatra
    (Moon's), Yoga, and Karana for that date."""
    if date_utc is None:
        date_utc = datetime.now(timezone.utc)

    sun_lon, moon_lon = _sidereal_longitudes(date_utc)
    nakshatra, pada = _nakshatra(moon_lon)

    return {
        "date": date_utc.date().isoformat(),
        "tithi": compute_tithi(sun_lon, moon_lon),
        "vara": VARA_NAMES[date_utc.weekday()],
        "nakshatra": nakshatra,
        "nakshatra_pada": pada,
        "yoga": compute_yoga(sun_lon, moon_lon),
        "karana": compute_karana(sun_lon, moon_lon),
    }
