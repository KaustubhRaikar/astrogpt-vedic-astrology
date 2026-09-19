"""
Current planetary transit positions ("gochara") — deterministic, pyswisseph,
NO AI involved, same discipline as chart_engine.py.

This is genuinely different from chart_engine.py: chart_engine computes
positions AT BIRTH (fixed forever once calculated); this computes positions
RIGHT NOW (changes daily). Questions like "where is Rahu right now" need
this, not the natal chart — which is exactly the gap that produced no
answer before this module existed.
"""
import swisseph as swe
from datetime import datetime, timezone
from .. import chart_engine


def get_current_transit(planet_name: str, natal_ascendant_sign_num: int) -> dict | None:
    """planet_name: e.g. 'Rahu', 'Saturn'. natal_ascendant_sign_num: 0-11,
    from the user's own natal chart — needed to express the transit as a
    house relative to THEIR chart (Vedic transit analysis is always relative
    to the natal ascendant, not an absolute house number)."""
    swe.set_sid_mode(swe.SIDM_LAHIRI)
    now = datetime.now(timezone.utc)
    jd_ut = swe.julday(now.year, now.month, now.day, now.hour + now.minute / 60)

    if planet_name == "Ketu":
        # Same rule as chart_engine: Ketu is always exactly opposite Rahu
        rahu_pos, _ = swe.calc_ut(jd_ut, swe.MEAN_NODE, swe.FLG_SIDEREAL)
        longitude = (rahu_pos[0] + 180) % 360
        speed = 0  # Ketu, like Rahu, is conventionally always treated as retrograde
        retrograde = True
    elif planet_name in chart_engine.PLANETS:
        pos, _ret = swe.calc_ut(jd_ut, chart_engine.PLANETS[planet_name],
                                 swe.FLG_SIDEREAL | swe.FLG_SPEED)
        longitude, speed = pos[0], pos[3]
        retrograde = speed < 0
    else:
        return None

    sign, sign_num, degree_in_sign = chart_engine._sign_and_degree(longitude)
    nakshatra, pada = chart_engine._nakshatra(longitude)
    house = ((sign_num - natal_ascendant_sign_num) % 12) + 1

    return {
        "planet": planet_name,
        "sign": sign,
        "degree_in_sign": round(degree_in_sign, 2),
        "house": house,  # relative to the user's own natal ascendant
        "nakshatra": nakshatra,
        "nakshatra_pada": pada,
        "retrograde": retrograde,
        "as_of": now.date().isoformat(),
    }
