"""
Tarot draw logic. The randomness is the point here — unlike astrology/
numerology, there's no "correct" answer to compute; the draw itself IS the
deterministic/auditable part (same cards drawn = same data every time you
look it up), and the AI's job (tarot_report.py) is purely interpretation of
whatever was actually drawn, same "don't invent what wasn't given" rule as
everywhere else in this app.
"""
import random
from .tarot_data import FULL_DECK


def draw_cards(count: int = 1, seed: int | None = None) -> list[dict]:
    """Draws `count` unique cards, each with a random upright/reversed
    orientation. Pass `seed` for a reproducible draw (e.g. testing); normal
    use should leave it None for a real random draw."""
    rng = random.Random(seed)
    drawn = rng.sample(FULL_DECK, count)
    results = []
    for card in drawn:
        is_upright = rng.random() < 0.5  # ONE coin flip per card, used for both fields
        results.append({
            "name": card["name"],
            "orientation": "upright" if is_upright else "reversed",
            "meaning": card["upright"] if is_upright else card["reversed"],
        })
    return results
