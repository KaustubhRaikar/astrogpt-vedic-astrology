"""
Divisional (varga) charts — D9 Navamsa and D10 Dashamsa, per the classical
Parashara division rules. Purely deterministic math on longitudes already
computed for the D1 chart — no new ephemeris calls needed, no AI involved.

D9 (Navamsa): used for marriage/dharma/planet-strength analysis.
D10 (Dashamsa): used for career/profession/authority analysis.

Future divisions (D7, D12, D20, D24, D60) follow the same pattern — add a
portion-count and a start-sign rule, same as D9/D10 below.
"""
from .chart_engine import SIGNS


def _absolute_longitude(sign_num: int, degree_in_sign: float) -> float:
    return sign_num * 30 + degree_in_sign


def _navamsa_sign(longitude: float) -> tuple[str, int]:
    """D9: each sign split into 9 parts of 3°20'. Classical rule (movable
    signs start counting from themselves, fixed from the 9th sign, dual from
    the 5th) reduces to this single formula: index = (sign*9 + portion) % 12."""
    sign_num = int(longitude // 30)
    degree_in_sign = longitude % 30
    portion = int(degree_in_sign // (30 / 9))
    d_index = (sign_num * 9 + portion) % 12
    return SIGNS[d_index], d_index


def _dashamsa_sign(longitude: float) -> tuple[str, int]:
    """D10: each sign split into 10 parts of 3°. Odd signs (Aries, Gemini,
    Leo, Libra, Sagittarius, Aquarius) count from themselves; even signs
    (Taurus, Cancer, Virgo, Scorpio, Capricorn, Pisces) count from the 9th
    sign from themselves."""
    sign_num = int(longitude // 30)
    degree_in_sign = longitude % 30
    portion = int(degree_in_sign // 3)
    if sign_num % 2 == 0:  # 0-indexed even = traditional odd-numbered sign
        d_index = (sign_num + portion) % 12
    else:
        d_index = (sign_num + 8 + portion) % 12
    return SIGNS[d_index], d_index


def _compute_divisional(chart: dict, divisional_fn) -> dict:
    asc_lon = _absolute_longitude(SIGNS.index(chart["ascendant_sign"]), chart["ascendant_degree"])
    asc_sign, asc_sign_num = divisional_fn(asc_lon)

    planets_out = []
    for p in chart["planets"]:
        lon = _absolute_longitude(p["sign_num"], p["degree_in_sign"])
        sign, sign_num = divisional_fn(lon)
        house = ((sign_num - asc_sign_num) % 12) + 1
        planets_out.append({
            "planet": p["planet"],
            "sign": sign,
            "house": house,
        })

    return {
        "ascendant_sign": asc_sign,
        "planets": planets_out,
    }


def compute_navamsa(chart: dict) -> dict:
    """D9 — marriage, dharma, planetary strength."""
    return _compute_divisional(chart, _navamsa_sign)


def compute_dashamsa(chart: dict) -> dict:
    """D10 — career, profession, authority."""
    return _compute_divisional(chart, _dashamsa_sign)
