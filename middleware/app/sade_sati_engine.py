"""
Sade Sati tracker — the 7.5-year period when transiting Saturn moves through
the 12th, 1st, and 2nd signs counted from the natal Moon sign. Deterministic,
no AI. Definition cross-checked against 9+ independent sources, all in exact
agreement (unlike the Gulika Kaal case) — high confidence.

Phase 1 (Rising):  Saturn in the 12th sign from natal Moon
Phase 2 (Peak):     Saturn ON the natal Moon's own sign
Phase 3 (Setting):  Saturn in the 2nd sign from natal Moon

ADDITIVE: only needs the natal Moon's sign (already computed and stored on
every chart) and today's transiting Saturn position (computed the same way
transit.py already does for other planets).
"""
import swisseph as swe
from datetime import datetime, timezone
from .chart_engine import SIGNS


def get_sade_sati_status(natal_moon_sign: str) -> dict:
    swe.set_sid_mode(swe.SIDM_LAHIRI)
    now = datetime.now(timezone.utc)
    jd_ut = swe.julday(now.year, now.month, now.day, now.hour + now.minute / 60)
    pos, _ = swe.calc_ut(jd_ut, swe.SATURN, swe.FLG_SIDEREAL)
    saturn_sign_num = int(pos[0] // 30)

    moon_sign_num = SIGNS.index(natal_moon_sign)
    diff = (saturn_sign_num - moon_sign_num) % 12  # 0=same sign, 11=sign before, 1=sign after

    if diff == 11:
        phase, in_sade_sati = "Rising Phase (Saturn in 12th from Moon)", True
    elif diff == 0:
        phase, in_sade_sati = "Peak Phase (Saturn on natal Moon sign)", True
    elif diff == 1:
        phase, in_sade_sati = "Setting Phase (Saturn in 2nd from Moon)", True
    else:
        phase, in_sade_sati = None, False

    return {
        "in_sade_sati": in_sade_sati,
        "phase": phase,
        "natal_moon_sign": natal_moon_sign,
        "transiting_saturn_sign": SIGNS[saturn_sign_num],
        "as_of": now.date().isoformat(),
    }
