"""
78-card tarot deck with traditional meanings. These are the standard,
centuries-old (Major Arcana) / widely-shared traditional interpretations —
public domain traditional knowledge, not reproducing any specific
copyrighted deck's proprietary text.
"""

MAJOR_ARCANA = [
    {"name": "The Fool", "upright": "New beginnings, spontaneity, a leap of faith", "reversed": "Recklessness, hesitation, being held back"},
    {"name": "The Magician", "upright": "Willpower, resourcefulness, manifestation", "reversed": "Manipulation, untapped potential, poor planning"},
    {"name": "The High Priestess", "upright": "Intuition, mystery, inner knowledge", "reversed": "Secrets withheld, disconnection from intuition"},
    {"name": "The Empress", "upright": "Abundance, nurturing, creativity", "reversed": "Creative block, dependence, neglect"},
    {"name": "The Emperor", "upright": "Structure, authority, stability", "reversed": "Rigidity, domination, lack of discipline"},
    {"name": "The Hierophant", "upright": "Tradition, guidance, shared belief", "reversed": "Breaking convention, personal belief over dogma"},
    {"name": "The Lovers", "upright": "Connection, alignment of values, choice", "reversed": "Imbalance, misaligned values, indecision"},
    {"name": "The Chariot", "upright": "Willpower, determination, victory through control", "reversed": "Lack of direction, aggression, loss of control"},
    {"name": "Strength", "upright": "Courage, patience, quiet inner strength", "reversed": "Self-doubt, weakness, lack of self-discipline"},
    {"name": "The Hermit", "upright": "Introspection, solitude, inner guidance", "reversed": "Isolation, withdrawal, avoiding reflection"},
    {"name": "Wheel of Fortune", "upright": "Cycles, change, turning points", "reversed": "Resistance to change, bad timing, setbacks"},
    {"name": "Justice", "upright": "Fairness, truth, cause and effect", "reversed": "Unfairness, dishonesty, avoiding accountability"},
    {"name": "The Hanged Man", "upright": "Pause, new perspective, letting go", "reversed": "Stalling, resistance, needless sacrifice"},
    {"name": "Death", "upright": "Transformation, endings that open the way for new beginnings", "reversed": "Resistance to change, stagnation, fear of letting go"},
    {"name": "Temperance", "upright": "Balance, moderation, patience", "reversed": "Imbalance, excess, discord"},
    {"name": "The Devil", "upright": "Attachment, restriction, confronting what binds you", "reversed": "Releasing old patterns, reclaiming power"},
    {"name": "The Tower", "upright": "Sudden upheaval, revelation, breaking false structures", "reversed": "Avoiding disaster, delayed collapse, fear of change"},
    {"name": "The Star", "upright": "Hope, renewal, inspiration", "reversed": "Discouragement, disconnection, lost faith"},
    {"name": "The Moon", "upright": "Uncertainty, intuition, the subconscious", "reversed": "Confusion clearing, releasing fear, hidden truth emerging"},
    {"name": "The Sun", "upright": "Joy, clarity, success", "reversed": "Temporary gloom, delayed success, low energy"},
    {"name": "Judgement", "upright": "Reflection, awakening, a call to a higher purpose", "reversed": "Self-doubt, avoiding a reckoning, harsh self-judgment"},
    {"name": "The World", "upright": "Completion, fulfillment, integration", "reversed": "Incompletion, delay, unfinished business"},
]

SUITS = {
    "Wands": "action, passion, creativity",
    "Cups": "emotion, relationships, intuition",
    "Swords": "thought, conflict, communication",
    "Pentacles": "material matters, work, resources",
}

MINOR_RANKS = [
    ("Ace", "new potential and raw energy"),
    ("Two", "balance or partnership"),
    ("Three", "growth and early results"),
    ("Four", "stability and structure"),
    ("Five", "conflict or instability"),
    ("Six", "harmony and cooperation"),
    ("Seven", "assessment and reflection"),
    ("Eight", "movement and focus"),
    ("Nine", "near-completion and resilience"),
    ("Ten", "culmination and completion"),
    ("Page", "a message or a student's energy"),
    ("Knight", "pursuit and momentum"),
    ("Queen", "mastery turned inward"),
    ("King", "mastery turned outward"),
]


def _build_minor_arcana() -> list[dict]:
    cards = []
    for suit, theme in SUITS.items():
        for rank, meaning_core in MINOR_RANKS:
            cards.append({
                "name": f"{rank} of {suit}",
                "upright": f"{meaning_core.capitalize()}, in the realm of {theme}",
                "reversed": f"Blocked or excessive {meaning_core}, in the realm of {theme}",
            })
    return cards


FULL_DECK = MAJOR_ARCANA + _build_minor_arcana()
