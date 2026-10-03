"""
Deterministic numerology calculation (Pythagorean system) — pure math, no
AI, same "deterministic engine, AI only interprets" split as chart_engine.py.

ADDITIVE ONLY: this module doesn't import from or modify anything else in
the app. It takes a name + dob (both already stored on an existing chart)
and returns numbers. Wiring it in (db table, endpoint) is a separate,
equally additive step — see the integration notes alongside this file.

LIMITATION, stated honestly: the Pythagorean letter-number system only
covers the Latin alphabet (A-Z). Non-Latin characters in a name are simply
skipped (under-counts rather than errors) — flag this if your user base
needs non-Latin name support; a different numerology system would be needed.
"""

LETTER_VALUES = {
    **{c: 1 for c in "AJS"},
    **{c: 2 for c in "BKT"},
    **{c: 3 for c in "CLU"},
    **{c: 4 for c in "DMV"},
    **{c: 5 for c in "ENW"},
    **{c: 6 for c in "FOX"},
    **{c: 7 for c in "GPY"},
    **{c: 8 for c in "HQZ"},
    **{c: 9 for c in "IR"},
}
VOWELS = set("AEIOU")
MASTER_NUMBERS = {11, 22, 33}


def _reduce(n: int) -> int:
    """Sum digits repeatedly to a single digit, UNLESS an intermediate sum
    is a master number (11/22/33) — those are kept as-is, standard convention."""
    while n > 9 and n not in MASTER_NUMBERS:
        n = sum(int(d) for d in str(n))
    return n


def _sum_letters(text: str, filter_fn=None) -> int:
    letters = [c for c in text.upper() if c.isalpha() and c in LETTER_VALUES]
    if filter_fn:
        letters = [c for c in letters if filter_fn(c)]
    return sum(LETTER_VALUES[c] for c in letters)


def life_path_number(dob: str) -> int:
    """dob: YYYY-MM-DD"""
    digits = [int(c) for c in dob if c.isdigit()]
    return _reduce(sum(digits))


def destiny_number(full_name: str) -> int:
    return _reduce(_sum_letters(full_name))


def soul_urge_number(full_name: str) -> int:
    return _reduce(_sum_letters(full_name, filter_fn=lambda c: c in VOWELS))


def personality_number(full_name: str) -> int:
    return _reduce(_sum_letters(full_name, filter_fn=lambda c: c not in VOWELS))


def birthday_number(dob: str) -> int:
    day = int(dob.split("-")[2])
    return _reduce(day)


def maturity_number(life_path: int, destiny: int) -> int:
    return _reduce(life_path + destiny)


def compute_numerology(name: str, dob: str) -> dict:
    lp = life_path_number(dob)
    destiny = destiny_number(name)
    return {
        "life_path_number": lp,
        "destiny_number": destiny,
        "soul_urge_number": soul_urge_number(name),
        "personality_number": personality_number(name),
        "birthday_number": birthday_number(dob),
        "maturity_number": maturity_number(lp, destiny),
    }
