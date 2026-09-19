"""
Pydantic request/response models.
These define the exact JSON shape the React Native app sends and receives —
keep them stable; RN's fetch/axios calls bind directly to these field names.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


# ---------- Common ----------

class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
    tokens_remaining: Optional[int] = None


class TokenBalance(BaseModel):
    user_id: str
    tokens_remaining: int


# ---------- Birth data input (Path A: form) ----------

class BirthDataIn(BaseModel):
    user_id: str
    name: str
    dob: str = Field(..., description="YYYY-MM-DD")
    time_of_birth: str = Field(..., description="HH:MM, 24hr, local time at birth place")
    place_of_birth: str = Field(..., description="Free-text place name, e.g. 'Mumbai, India'")


# ---------- Birth data input (Path B: image/file upload) ----------
# File bytes travel as multipart/form-data in the actual endpoint (not in this JSON body);
# this schema documents the metadata fields sent alongside the file.

class UploadMeta(BaseModel):
    user_id: str
    note: Optional[str] = None  # e.g. "existing kundali chart" / "birth certificate"


# ---------- Chart output ----------

class PlanetPosition(BaseModel):
    planet: str
    sign: str
    sign_num: int
    degree_in_sign: float
    house: int
    nakshatra: str
    nakshatra_pada: int
    retrograde: bool


class DashaPeriod(BaseModel):
    lord: str
    start: str  # ISO date
    end: str    # ISO date


class KundaliChart(BaseModel):
    chart_id: str
    user_id: str
    name: str
    dob: str
    time_of_birth: str
    place_of_birth: str
    latitude: float
    longitude: float
    timezone_offset: float
    ascendant_sign: str
    ascendant_degree: float
    planets: List[PlanetPosition]
    current_dasha: DashaPeriod
    dasha_timeline: List[DashaPeriod]
    generated_at: str


# ---------- Report (Tier 1 grounding document) ----------

class ReportSections(BaseModel):
    personality_nature: str
    career_wealth: str
    relationships_marriage: str
    health: str
    family: str
    current_dasha_effects: str
    key_yogas_doshas: str
    life_themes: str


class KundaliReport(BaseModel):
    chart_id: str
    sections: ReportSections
    generated_at: str


class ReportGenerateIn(BaseModel):
    chart_id: str


# ---------- Chart list (chart-switcher UI) ----------

class ChartSummary(BaseModel):
    chart_id: str
    name: str
    generated_at: str


# ---------- Auth ----------

class RegisterIn(BaseModel):
    user_id: str
    display_name: Optional[str] = None


class RegisterOut(BaseModel):
    user_id: str
    tokens_remaining: int


# ---------- Places autocomplete ----------

class PlaceCandidate(BaseModel):
    display_name: str
    latitude: float
    longitude: float


# ---------- Token purchase ----------

class PurchaseIn(BaseModel):
    user_id: str
    plan_id: str  # "star" | "constellation" | "galaxy"


class PurchaseOut(BaseModel):
    user_id: str
    plan_id: str
    tokens_added: int
    tokens_remaining: int


# ---------- Chat (Tier 2 grounded conversation) ----------

class ChatMessageIn(BaseModel):
    chart_id: str
    message: str
    language: Optional[str] = "en"  # BCP-47-ish code; NLLB-200 target language


class ChatMessageOut(BaseModel):
    reply: str
    intent: str
    section_used: Optional[str] = None
    tokens_remaining: int


class ChatHistoryItem(BaseModel):
    role: str  # "user" | "assistant"
    message: str
    timestamp: str


# ---------- Compatibility ----------

class CompatibilityIn(BaseModel):
    chart_id_a: str
    chart_id_b: str


class CompatibilityOut(BaseModel):
    manglik_a: dict
    manglik_b: dict
    ashta_koota: dict


# ---------- Daily insight ----------

class DailyInsightOut(BaseModel):
    chart_id: str
    energy: str
    focus: str
    guidance: str
    caution: Optional[str] = None
    transits_used: list[dict]


# ---------- Divisional charts ----------

class DivisionalChartOut(BaseModel):
    chart_id: str
    division: str  # "D9" | "D10"
    ascendant_sign: str
    planets: list[dict]
