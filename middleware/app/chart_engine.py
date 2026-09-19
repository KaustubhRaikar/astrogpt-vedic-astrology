"""
Deterministic Vedic chart calculation — pyswisseph only, NO AI involved.
This is the "ground truth" layer: Gemini interprets this output, it never
computes it. Keeping this file AI-free is intentional and important.
"""
import swisseph as swe
import uuid
from datetime import datetime, timedelta, timezone
from geopy.geocoders import Nominatim
from geopy.timezone import Timezone  # noqa: F401 (kept for future use)
from timezonefinder import TimezoneFinder
import pytz
from . import config

SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
]

NAKSHATRAS = [
    "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
    "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
    "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
    "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta",
    "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati",
]

PLANETS = {
    "Sun": swe.SUN, "Moon": swe.MOON, "Mars": swe.MARS, "Mercury": swe.MERCURY,
    "Jupiter": swe.JUPITER, "Venus": swe.VENUS, "Saturn": swe.SATURN,
    "Rahu": swe.MEAN_NODE,  # True/Mean Node — Rahu
}

# Vimshottari Dasha: lord -> years, in the fixed traditional sequence
DASHA_SEQUENCE = [
    ("Ketu", 7), ("Venus", 20), ("Sun", 6), ("Moon", 10), ("Mars", 7),
    ("Rahu", 18), ("Jupiter", 16), ("Saturn", 19), ("Mercury", 17),
]
DASHA_TOTAL_YEARS = sum(y for _, y in DASHA_SEQUENCE)  # 120


def geocode_place(place_name: str) -> tuple[float, float]:
    """Free-text place -> (lat, lon). Uses Nominatim (OpenStreetMap), free/no key."""
    geolocator = Nominatim(user_agent=config.GEOCODER_USER_AGENT)
    location = geolocator.geocode(place_name)
    if not location:
        raise ValueError(f"Could not geocode place: {place_name}")
    return location.latitude, location.longitude


def get_utc_datetime(dob: str, time_of_birth: str, lat: float, lon: float) -> datetime:
    """Converts local birth date/time at (lat, lon) into a UTC datetime, handling
    the birth place's timezone (including historical DST) correctly."""
    tf = TimezoneFinder()
    tz_name = tf.timezone_at(lat=lat, lng=lon)
    if not tz_name:
        raise ValueError("Could not resolve timezone for coordinates")
    local_tz = pytz.timezone(tz_name)

    naive_local = datetime.strptime(f"{dob} {time_of_birth}", "%Y-%m-%d %H:%M")
    local_dt = local_tz.localize(naive_local)
    return local_dt.astimezone(pytz.utc)


def _sign_and_degree(longitude: float) -> tuple[str, int, float]:
    sign_num = int(longitude // 30)
    degree_in_sign = longitude % 30
    return SIGNS[sign_num], sign_num, degree_in_sign


def _nakshatra(longitude: float) -> tuple[str, int]:
    """27 nakshatras span 360 deg -> 13°20' each, 4 padas of 3°20' each."""
    span = 360 / 27
    idx = int(longitude // span)
    remainder = longitude % span
    pada = int(remainder // (span / 4)) + 1
    return NAKSHATRAS[idx], pada


def _house_of(longitude: float, asc_longitude: float) -> int:
    """Whole-sign houses: house = sign offset from ascendant's sign, 1-indexed."""
    asc_sign = int(asc_longitude // 30)
    planet_sign = int(longitude // 30)
    return ((planet_sign - asc_sign) % 12) + 1


def _moon_nakshatra_fraction(moon_longitude: float) -> tuple[str, float]:
    """Which nakshatra lord starts the dasha sequence, and how far through
    that nakshatra the Moon already is (determines the balance of the first dasha)."""
    span = 360 / 27
    idx = int(moon_longitude // span)
    fraction_elapsed = (moon_longitude % span) / span
    # Nakshatra lords cycle through the same 9-lord dasha sequence, 3 nakshatras per lord
    lord = DASHA_SEQUENCE[idx % 9][0]
    return lord, fraction_elapsed


def calculate_dasha_timeline(moon_longitude: float, birth_dt_utc: datetime) -> list[dict]:
    """Vimshottari Dasha timeline starting from birth, based on Moon's nakshatra."""
    start_lord, fraction_elapsed = _moon_nakshatra_fraction(moon_longitude)
    start_idx = next(i for i, (lord, _) in enumerate(DASHA_SEQUENCE) if lord == start_lord)

    # Balance of the first (birth) dasha
    first_lord, first_years = DASHA_SEQUENCE[start_idx]
    remaining_years = first_years * (1 - fraction_elapsed)

    timeline = []
    cursor = birth_dt_utc
    end = cursor + timedelta(days=remaining_years * 365.25)
    timeline.append({"lord": first_lord, "start": cursor.date().isoformat(),
                      "end": end.date().isoformat()})
    cursor = end

    # Remaining lords in sequence, full durations, cycling through DASHA_SEQUENCE
    idx = (start_idx + 1) % 9
    for _ in range(8):  # rest of the 120-year cycle
        lord, years = DASHA_SEQUENCE[idx]
        end = cursor + timedelta(days=years * 365.25)
        timeline.append({"lord": lord, "start": cursor.date().isoformat(),
                          "end": end.date().isoformat()})
        cursor = end
        idx = (idx + 1) % 9

    return timeline


def get_current_dasha(dasha_timeline: list[dict]) -> dict:
    today = datetime.now(timezone.utc).date().isoformat()
    for period in dasha_timeline:
        if period["start"] <= today <= period["end"]:
            return period
    return dasha_timeline[0]  # fallback, shouldn't normally happen


def generate_chart(user_id: str, name: str, dob: str, time_of_birth: str,
                    place_of_birth: str) -> dict:
    """Main entry point: BirthData -> full structured KundaliChart dict."""
    lat, lon = geocode_place(place_of_birth)
    utc_dt = get_utc_datetime(dob, time_of_birth, lat, lon)

    swe.set_sid_mode(swe.SIDM_LAHIRI)
    jd_ut = swe.julday(utc_dt.year, utc_dt.month, utc_dt.day,
                        utc_dt.hour + utc_dt.minute / 60 + utc_dt.second / 3600)

    # Ascendant (Lagna)
    _cusps, ascmc = swe.houses_ex(jd_ut, lat, lon, config.HOUSE_SYSTEM, flags=swe.FLG_SIDEREAL)
    asc_longitude = ascmc[0]
    asc_sign, _asc_sign_num, asc_degree = _sign_and_degree(asc_longitude)

    planets_out = []
    moon_longitude = None
    for pname, pcode in PLANETS.items():
        pos, _ret = swe.calc_ut(jd_ut, pcode, swe.FLG_SIDEREAL | swe.FLG_SPEED)
        longitude, _lat_, _dist, speed = pos[0], pos[1], pos[2], pos[3]
        sign, sign_num, deg_in_sign = _sign_and_degree(longitude)
        nak, pada = _nakshatra(longitude)
        house = _house_of(longitude, asc_longitude)
        planets_out.append({
            "planet": pname,
            "sign": sign,
            "sign_num": sign_num,
            "degree_in_sign": round(deg_in_sign, 4),
            "house": house,
            "nakshatra": nak,
            "nakshatra_pada": pada,
            "retrograde": speed < 0,
        })
        if pname == "Moon":
            moon_longitude = longitude

    # Ketu is always exactly opposite Rahu (180 degrees)
    rahu = next(p for p in planets_out if p["planet"] == "Rahu")
    ketu_longitude = ( (rahu["sign_num"] * 30 + rahu["degree_in_sign"]) + 180 ) % 360
    ketu_sign, ketu_sign_num, ketu_deg = _sign_and_degree(ketu_longitude)
    ketu_nak, ketu_pada = _nakshatra(ketu_longitude)
    planets_out.append({
        "planet": "Ketu",
        "sign": ketu_sign,
        "sign_num": ketu_sign_num,
        "degree_in_sign": round(ketu_deg, 4),
        "house": _house_of(ketu_longitude, asc_longitude),
        "nakshatra": ketu_nak,
        "nakshatra_pada": ketu_pada,
        "retrograde": True,  # Ketu, like Rahu, is always treated as retrograde
    })

    dasha_timeline = calculate_dasha_timeline(moon_longitude, utc_dt)
    current_dasha = get_current_dasha(dasha_timeline)

    return {
        "chart_id": str(uuid.uuid4()),
        "user_id": user_id,  # the account that generated/owns this chart
        "name": name,        # the chart SUBJECT's name — may differ from the
                              # account holder's own name (e.g. a family member's chart)
        "dob": dob,
        "time_of_birth": time_of_birth,
        "place_of_birth": place_of_birth,
        "latitude": lat,
        "longitude": lon,
        "timezone_offset": utc_dt.utcoffset().total_seconds() / 3600 if utc_dt.utcoffset() else 0,
        "ascendant_sign": asc_sign,
        "ascendant_degree": round(asc_degree, 4),
        "planets": planets_out,
        "current_dasha": current_dasha,
        "dasha_timeline": dasha_timeline,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
