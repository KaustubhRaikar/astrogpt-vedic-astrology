"""
Backs the RN client's debounced city/place search field (kundali.ts ->
GET /places/search?q=). Separate from chart_engine.geocode_place, which
resolves ONE final place at chart-generation time — this returns several
candidates so the user picks the correct one before submitting.
"""
from geopy.geocoders import Nominatim
from . import config


def search_places(query: str, limit: int = 5) -> list[dict]:
    if not query or len(query.strip()) < 2:
        return []
    geolocator = Nominatim(user_agent=config.GEOCODER_USER_AGENT)
    results = geolocator.geocode(query, exactly_one=False, limit=limit) or []
    return [
        {
            "display_name": r.address,
            "latitude": r.latitude,
            "longitude": r.longitude,
        }
        for r in results
    ]
