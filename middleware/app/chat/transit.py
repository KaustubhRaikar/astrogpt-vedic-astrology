"""
Current (or future-dated) planetary transit positions ("gochara") —
deterministic, pyswisseph, NO AI involved.

SMALL EXTENSION for the weekly/monthly forecast feature: added an optional
`target_date` parameter (defaults to now, exactly as before) so callers can
ask "where will this planet be on this future date" instead of only "right
now." Every existing call site that doesn't pass target_date behaves
identically to before — this is additive, not a signature-breaking change.
"""
import swisseph as swe
from datetime import datetime, timezone
from .. import chart_engine


def get_current_transit(planet_name: str, natal_ascendant_sign_num: int,
                         target_date: datetime | None = None) -> dict | None:
    """planet_name: e.g. 'Rahu', 'Saturn'. natal_ascendant_sign_num: 0-11.
    target_date: defaults to now (UTC) if not given — existing behavior
    unchanged for any caller that doesn't pass this."""
    swe.set_sid_mode(swe.SIDM_LAHIRI)
    now = target_date if target_date is not None else datetime.now(timezone.utc)
    jd_ut = swe.julday(now.year, now.month, now.day, now.hour + now.minute / 60)

    if planet_name == "Ketu":
        rahu_pos, _ = swe.calc_ut(jd_ut, swe.MEAN_NODE, swe.FLG_SIDEREAL)
        longitude = (rahu_pos[0] + 180) % 360
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
        "house": house,
        "nakshatra": nakshatra,
        "nakshatra_pada": pada,
        "retrograde": retrograde,
        "as_of": now.date().isoformat(),
    }
