"""
Muhurta (auspicious/inauspicious timing windows) — deterministic, no AI.
Real sunrise/sunset via pyswisseph's rise_trans, then the daylight span is
divided into 8 equal segments for Rahu Kalam and Yamaganda.

HONESTY NOTE: Rahu Kalam and Yamaganda segment-per-weekday assignments were
cross-checked against 6+ independent sources and are consistent — high
confidence. Gulika Kaal (a third commonly-paired inauspicious period) is
DELIBERATELY NOT included — sources genuinely disagree with each other on
its segment assignment (two different tables contradict each other), and
presenting a wrong "auspicious timing" as confident fact is worse than
leaving a gap. Add it only once you've found an authoritative single source
(e.g. cross-checked against a professional Panchang tool for several dates).
"""
import swisseph as swe
from datetime import datetime, timedelta, timezone

# Segment (1-8, 1-indexed from sunrise) assigned to each calendar weekday.
# Python's date.weekday(): Monday=0 ... Sunday=6
RAHU_KALAM_SEGMENT = {0: 2, 1: 7, 2: 5, 3: 6, 4: 4, 5: 3, 6: 8}  # Mon..Sun
YAMAGANDA_SEGMENT = {0: 4, 1: 3, 2: 2, 3: 1, 4: 7, 5: 6, 6: 5}   # Mon..Sun


def get_sunrise_sunset(date_utc: datetime, lat: float, lon: float) -> tuple[datetime, datetime]:
    """Returns (sunrise, sunset) as UTC datetimes for the given date/location."""
    jd_ut = swe.julday(date_utc.year, date_utc.month, date_utc.day, 0.0)
    geopos = (lon, lat, 0)  # longitude, latitude, altitude-in-meters

    _res, rise_tret = swe.rise_trans(jd_ut, swe.SUN, swe.CALC_RISE, geopos)
    _res, set_tret = swe.rise_trans(jd_ut, swe.SUN, swe.CALC_SET, geopos)

    sunrise_jd = rise_tret[0]
    sunset_jd = set_tret[0]

    def jd_to_datetime(jd: float) -> datetime:
        y, m, d, h = swe.revjul(jd)
        hour = int(h)
        minute = int((h - hour) * 60)
        second = int((((h - hour) * 60) - minute) * 60)
        return datetime(y, m, d, hour, minute, second, tzinfo=timezone.utc)

    return jd_to_datetime(sunrise_jd), jd_to_datetime(sunset_jd)


def _segment_window(sunrise: datetime, sunset: datetime, segment_num: int) -> tuple[datetime, datetime]:
    """segment_num: 1-8, 1-indexed."""
    daylight = sunset - sunrise
    segment_length = daylight / 8
    start = sunrise + segment_length * (segment_num - 1)
    end = sunrise + segment_length * segment_num
    return start, end


def compute_muhurta(date_utc: datetime, lat: float, lon: float) -> dict:
    sunrise, sunset = get_sunrise_sunset(date_utc, lat, lon)
    weekday = date_utc.weekday()

    rahu_start, rahu_end = _segment_window(sunrise, sunset, RAHU_KALAM_SEGMENT[weekday])
    yama_start, yama_end = _segment_window(sunrise, sunset, YAMAGANDA_SEGMENT[weekday])

    # Abhijit Muhurta: the 8th of 15 equal divisions of the day — roughly
    # solar midday ± ~24 min. Widely and consistently defined this way.
    daylight = sunset - sunrise
    fifteenth = daylight / 15
    abhijit_start = sunrise + fifteenth * 7
    abhijit_end = sunrise + fifteenth * 8

    return {
        "date": date_utc.date().isoformat(),
        "sunrise": sunrise.isoformat(),
        "sunset": sunset.isoformat(),
        "rahu_kalam": {"start": rahu_start.isoformat(), "end": rahu_end.isoformat()},
        "yamaganda": {"start": yama_start.isoformat(), "end": yama_end.isoformat()},
        "abhijit_muhurta": {"start": abhijit_start.isoformat(), "end": abhijit_end.isoformat()},
    }
