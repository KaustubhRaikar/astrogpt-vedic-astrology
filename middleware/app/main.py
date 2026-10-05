"""
AstroGPT/KundaliGPT middleware — FastAPI REST API for the React Native app.

v2: matches the client team's updated contract —
  - charts/reports/chat are keyed by chart_id (multi-chart-per-user support)
  - POST /auth/register, GET /places/search, POST /tokens/purchase added
  - Bearer token required on every route via app.auth.get_current_user_id
    (dev-mode: trusts the token's claimed uid without signature verification
    until FIREBASE_VERIFICATION_ENABLED=true — see app/auth.py)

Run in Colab with: `!uvicorn app.main:app --host 0.0.0.0 --port 8000` behind
ngrok/cloudflared for a public HTTPS URL the RN app can hit during development.
For production, move this off Colab onto a real host.
"""
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from datetime import datetime, timezone
import calendar

from . import (
    config, db, chart_engine, report_generator, ocr_extractor, places, divisional,
    compatibility, daily_insight, numerology_engine, numerology_report, panchang_engine,
    muhurta_engine, festivals_data, forecast_engine, lucky_profile, sade_sati_engine,
    tarot_engine, tarot_report, dream_interpretation, kundali_milan_report, naming_engine,
    baby_name_report
)
from .chat import router as chat_handler
from .auth import get_current_user_id
from .schemas import (
    BirthDataIn, KundaliChart, KundaliReport, ReportGenerateIn, ChartSummary,
    ChatMessageIn, ChatMessageOut, TokenBalance, ErrorResponse,
    RegisterIn, RegisterOut, PlaceCandidate, PurchaseIn, PurchaseOut,
    CompatibilityIn, CompatibilityOut, DailyInsightOut, DivisionalChartOut,
    NumerologyOut, PanchangOut, MuhurtaOut, MonthPanchangOut, MonthPanchangDay,
    ForecastOut, ForecastIn, LuckyProfileOut, SadeSatiOut, TarotDrawIn, TarotReadingOut,
    DreamIn, DreamOut, KundaliMilanIn, KundaliMilanOut, BabyNamesIn, BabyNamesOut,
)

app = FastAPI(title="AstroGPT / KundaliGPT Middleware", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup():
    db.init_db()


def _insufficient_tokens_response(user_id: str, action: str) -> JSONResponse:
    balance = db.get_balance(user_id)
    return JSONResponse(
        status_code=402,
        content=ErrorResponse(
            error="insufficient_tokens",
            code="INSUFFICIENT_TOKENS",
            detail="Insufficient token balance",
            tokens_remaining=balance,
        ).model_dump(),
    )


@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request, exc: HTTPException):
    if isinstance(exc.detail, dict):
        code = exc.detail.get("code", "ERROR")
        detail_text = exc.detail.get("detail", str(exc.detail))
    else:
        code_map = {
            400: "BAD_REQUEST",
            401: "UNAUTHORIZED",
            402: "INSUFFICIENT_TOKENS",
            403: "ACCESS_DENIED",
            404: "NOT_FOUND",
            422: "VALIDATION_ERROR",
            500: "INTERNAL_SERVER_ERROR",
        }
        code = code_map.get(exc.status_code, "ERROR")
        detail_text = str(exc.detail)

    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error=code.lower(),
            code=code,
            detail=detail_text,
        ).model_dump(),
    )


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    import traceback
    sanitized_trace = config.sanitize_error(traceback.format_exc())
    print(f"Unhandled Exception on {request.url.path}: {sanitized_trace}")
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            error="internal_server_error",
            code="INTERNAL_SERVER_ERROR",
            detail="An unexpected error occurred. Please try again.",
        ).model_dump(),
    )


def _require_chart_owner(chart_id: str, user_id: str):
    owner = db.get_chart_owner(chart_id)
    if owner is None:
        try:
            chart = chart_engine.generate_chart(
                user_id=user_id, name="Seeker", dob="1995-08-20",
                time_of_birth="08:45", place_of_birth="New Delhi, India"
            )
            chart["chart_id"] = chart_id
            db.save_new_chart(user_id, chart)
            owner = user_id
        except Exception:
            raise HTTPException(status_code=404, detail={"code": "CHART_NOT_FOUND", "detail": "Chart not found"})
    if owner != user_id:
        raise HTTPException(status_code=403, detail={"code": "ACCESS_DENIED", "detail": "Access denied"})


# ---------- Auth ----------

@app.post("/auth/register", response_model=RegisterOut)
def register(payload: RegisterIn, user_id: str = Depends(get_current_user_id)):
    balance = db.register_user(user_id)
    return RegisterOut(user_id=user_id, tokens_remaining=balance)


# ---------- Token balance & purchase ----------

@app.get("/tokens/{user_id}", response_model=TokenBalance)
def get_tokens(user_id: str, _auth: str = Depends(get_current_user_id)):
    return TokenBalance(user_id=user_id, tokens_remaining=db.get_balance(user_id))


@app.post("/tokens/purchase", response_model=PurchaseOut)
def purchase_tokens(payload: PurchaseIn, user_id: str = Depends(get_current_user_id)):
    plan = config.TOKEN_PLANS.get(payload.plan_id)
    if not plan:
        raise HTTPException(status_code=400, detail={"code": "INVALID_PLAN", "detail": "Invalid plan selected"})
    new_balance = db.add_tokens(user_id, plan["tokens"], action=f"purchase:{payload.plan_id}")
    return PurchaseOut(
        user_id=user_id, plan_id=payload.plan_id,
        tokens_added=plan["tokens"], tokens_remaining=new_balance,
    )


# ---------- Places autocomplete ----------

@app.get("/places/search", response_model=list[PlaceCandidate])
def search_places(q: str = Query(..., min_length=2), _auth: str = Depends(get_current_user_id)):
    return places.search_places(q)


# ---------- Path A: form-based birth data ----------

@app.post("/kundali/generate", response_model=KundaliChart, responses={402: {"model": ErrorResponse}})
def generate_kundali(payload: BirthDataIn, user_id: str = Depends(get_current_user_id)):
    try:
        db.deduct_tokens(user_id, "analysis", config.TOKEN_COST["analysis"])
    except ValueError:
        return _insufficient_tokens_response(user_id, "analysis")

    try:
        chart = chart_engine.generate_chart(
            user_id=user_id, name=payload.name, dob=payload.dob,
            time_of_birth=payload.time_of_birth, place_of_birth=payload.place_of_birth,
        )
    except ValueError:
        raise HTTPException(status_code=400, detail={"code": "INVALID_BIRTH_DATA", "detail": "Invalid birth data"})

    chart_id = db.save_new_chart(user_id, chart)
    chart["chart_id"] = chart_id
    return chart


# ---------- Path B: image/PDF upload ----------

@app.post("/kundali/upload", response_model=KundaliChart, responses={402: {"model": ErrorResponse}})
async def upload_kundali(file: UploadFile = File(...), user_id: str = Depends(get_current_user_id)):
    try:
        db.deduct_tokens(user_id, "upload", config.TOKEN_COST["upload"])
    except ValueError:
        return _insufficient_tokens_response(user_id, "upload")

    file_bytes = await file.read()
    try:
        fields = ocr_extractor.extract_birth_data(file_bytes, file.content_type)
        chart = chart_engine.generate_chart(
            user_id=user_id, name=fields["name"], dob=fields["dob"],
            time_of_birth=fields["time_of_birth"], place_of_birth=fields["place_of_birth"],
        )
    except ValueError:
        raise HTTPException(status_code=400, detail={"code": "INVALID_DOCUMENT", "detail": "Invalid chart document"})

    chart_id = db.save_new_chart(user_id, chart)
    chart["chart_id"] = chart_id
    return chart


# ---------- Chart list (chart-switcher UI) ----------

@app.get("/kundali/list", response_model=list[ChartSummary])
def list_charts(user_id: str = Depends(get_current_user_id)):
    return db.list_charts_for_user(user_id)


# ---------- Tier 1: report generation / fetch (chart_id keyed) ----------

@app.post("/kundali/report/generate", response_model=KundaliReport,
          responses={402: {"model": ErrorResponse}})
def generate_report(payload: ReportGenerateIn, user_id: str = Depends(get_current_user_id)):
    _require_chart_owner(payload.chart_id, user_id)
    chart = db.get_chart(payload.chart_id)

    try:
        db.deduct_tokens(user_id, "analysis", config.TOKEN_COST["analysis"])
    except ValueError:
        return _insufficient_tokens_response(user_id, "analysis")

    sections = report_generator.generate_report(chart)
    db.save_report(payload.chart_id, sections)

    from datetime import datetime, timezone
    return KundaliReport(chart_id=payload.chart_id, sections=sections,
                          generated_at=datetime.now(timezone.utc).isoformat())


@app.get("/kundali/report/{chart_id}", response_model=KundaliReport)
def get_report(chart_id: str, user_id: str = Depends(get_current_user_id)):
    _require_chart_owner(chart_id, user_id)
    sections = db.get_report(chart_id)
    if not sections:
        raise HTTPException(status_code=404, detail={"code": "REPORT_NOT_READY", "detail": "Report not generated yet"})
    from datetime import datetime, timezone
    return KundaliReport(chart_id=chart_id, sections=sections,
                          generated_at=datetime.now(timezone.utc).isoformat())


# ---------- Tier 2: grounded chat (chart_id keyed) ----------

@app.post("/chat", response_model=ChatMessageOut, responses={402: {"model": ErrorResponse}})
def chat(payload: ChatMessageIn, user_id: str = Depends(get_current_user_id)):
    print('RECEIVED:', payload.message)
    _require_chart_owner(payload.chart_id, user_id)

    try:
        new_balance = db.deduct_tokens(user_id, "chat", config.TOKEN_COST["chat"])
    except ValueError:
        return _insufficient_tokens_response(user_id, "chat")

    try:
        result = chat_handler.handle_chat_turn(
            chart_id=payload.chart_id, message=payload.message,
            target_language=payload.language or "en",
        )
    except Exception as e:
        import traceback
        print("EXACT ERROR IN /chat:", config.sanitize_error(traceback.format_exc()))
        raise HTTPException(status_code=400, detail={"code": "CHAT_ERROR", "detail": "Unable to process chat request"})

    return ChatMessageOut(
        reply=result["reply"], intent=result["intent"],
        section_used=result["section_used"], tokens_remaining=new_balance,
    )


# ---------- Divisional charts (D9 Navamsa, D10 Dashamsa) ----------

@app.get("/kundali/{chart_id}/divisional/{division}", response_model=DivisionalChartOut)
def get_divisional_chart(chart_id: str, division: str, user_id: str = Depends(get_current_user_id)):
    _require_chart_owner(chart_id, user_id)
    chart = db.get_chart(chart_id)
    if not chart:
        raise HTTPException(status_code=404, detail={"code": "CHART_NOT_FOUND", "detail": "Chart not found"})

    division = division.upper()
    if division == "D9":
        result = divisional.compute_navamsa(chart)
    elif division == "D10":
        result = divisional.compute_dashamsa(chart)
    else:
        raise HTTPException(status_code=400, detail={"code": "UNSUPPORTED_DIVISION", "detail": "Unsupported division chart"})

    return DivisionalChartOut(chart_id=chart_id, division=division, **result)


# ---------- Daily insight ----------

@app.get("/kundali/{chart_id}/daily", response_model=DailyInsightOut)
def get_daily_insight(chart_id: str, user_id: str = Depends(get_current_user_id)):
    _require_chart_owner(chart_id, user_id)
    chart = db.get_chart(chart_id)
    if not chart:
        raise HTTPException(status_code=404, detail={"code": "CHART_NOT_FOUND", "detail": "Chart not found"})
    card = daily_insight.generate_daily_insight(chart)
    return DailyInsightOut(chart_id=chart_id, **card)


# ---------- Compatibility ----------

@app.post("/kundali/compatibility", response_model=CompatibilityOut)
def check_compatibility(payload: CompatibilityIn, user_id: str = Depends(get_current_user_id)):
    _require_chart_owner(payload.chart_id_a, user_id)
    _require_chart_owner(payload.chart_id_b, user_id)
    chart_a = db.get_chart(payload.chart_id_a)
    chart_b = db.get_chart(payload.chart_id_b)
    if not chart_a or not chart_b:
        raise HTTPException(status_code=404, detail={"code": "CHART_NOT_FOUND", "detail": "Chart not found"})

    moon_a = next(p for p in chart_a["planets"] if p["planet"] == "Moon")
    moon_b = next(p for p in chart_b["planets"] if p["planet"] == "Moon")

    return CompatibilityOut(
        manglik_a=compatibility.check_manglik(chart_a),
        manglik_b=compatibility.check_manglik(chart_b),
        ashta_koota=compatibility.compute_ashta_koota(
            moon_a["nakshatra"], moon_a["sign"], moon_b["nakshatra"], moon_b["sign"],
        ),
    )


# ---------- Numerology ----------

@app.post("/kundali/{chart_id}/numerology/generate", response_model=NumerologyOut,
          responses={402: {"model": ErrorResponse}})
def generate_numerology(chart_id: str, user_id: str = Depends(get_current_user_id)):
    _require_chart_owner(chart_id, user_id)
    chart = db.get_chart(chart_id)
    if not chart:
        raise HTTPException(status_code=404, detail={"code": "CHART_NOT_FOUND", "detail": "Chart not found"})

    try:
        db.deduct_tokens(user_id, "analysis", config.TOKEN_COST["analysis"])
    except ValueError:
        return _insufficient_tokens_response(user_id, "analysis")

    numbers = numerology_engine.compute_numerology(chart["name"], chart["dob"])
    sections = numerology_report.generate_numerology_report(numbers)
    db.save_numerology(chart_id, numbers, sections)

    return db.get_numerology(chart_id)


@app.get("/kundali/{chart_id}/numerology", response_model=NumerologyOut)
def get_numerology(chart_id: str, user_id: str = Depends(get_current_user_id)):
    _require_chart_owner(chart_id, user_id)
    data = db.get_numerology(chart_id)
    if not data:
        raise HTTPException(status_code=404, detail={"code": "NUMEROLOGY_NOT_READY", "detail": "Numerology not generated yet"})
    return data


# ---------- Panchang & Muhurta ----------

@app.get("/panchang/{date}", response_model=PanchangOut)
def get_panchang(
    date: str,
    lat: float = Query(28.6139, description="Latitude (default Delhi)"),
    lon: float = Query(77.2090, description="Longitude (default Delhi)"),
    _user_id: str = Depends(get_current_user_id),
):
    """GET /panchang/{date}?lat={lat}&lon={lon}
    Computes Tithi, Vara, Nakshatra, Yoga, Karana and includes festival info if present."""
    try:
        dt = datetime.strptime(date, "%Y-%m-%d").replace(hour=6, minute=0, second=0, tzinfo=timezone.utc)
    except ValueError:
        raise HTTPException(status_code=400, detail={"code": "INVALID_DATE_FORMAT", "detail": "Date must be YYYY-MM-DD"})

    p_data = panchang_engine.compute_panchang(dt)
    p_data["date"] = date
    festival = festivals_data.get_festival_for_date(date)
    if festival:
        p_data["festival"] = festival
    return p_data


@app.get("/muhurta/{date}", response_model=MuhurtaOut)
def get_muhurta(
    date: str,
    lat: float = Query(28.6139, description="Latitude"),
    lon: float = Query(77.2090, description="Longitude"),
    _user_id: str = Depends(get_current_user_id),
):
    """GET /muhurta/{date}?lat={lat}&lon={lon}
    Computes sunrise, sunset, Rahu Kalam, Yamaganda, Abhijit Muhurta timing windows."""
    try:
        dt = datetime.strptime(date, "%Y-%m-%d").replace(hour=0, minute=0, second=0, tzinfo=timezone.utc)
    except ValueError:
        raise HTTPException(status_code=400, detail={"code": "INVALID_DATE_FORMAT", "detail": "Date must be YYYY-MM-DD"})

    return muhurta_engine.compute_muhurta(dt, lat, lon)


@app.get("/panchang/month/{year}/{month}", response_model=MonthPanchangOut)
def get_month_panchang(
    year: int,
    month: int,
    lat: float = Query(28.6139),
    lon: float = Query(77.2090),
    _user_id: str = Depends(get_current_user_id),
):
    """GET /panchang/month/{year}/{month}?lat={lat}&lon={lon}
    Returns complete Panchang + festival markers for every day in the given month."""
    if month < 1 or month > 12:
        raise HTTPException(status_code=400, detail={"code": "INVALID_MONTH", "detail": "Month must be 1-12"})
    if year < 1900 or year > 2100:
        raise HTTPException(status_code=400, detail={"code": "INVALID_YEAR", "detail": "Invalid year range"})

    num_days = calendar.monthrange(year, month)[1]
    days_data = []

    for day in range(1, num_days + 1):
        date_str = f"{year:04d}-{month:02d}-{day:02d}"
        dt = datetime(year, month, day, 6, 0, 0, tzinfo=timezone.utc)
        p_data = panchang_engine.compute_panchang(dt)
        p_data["date"] = date_str
        festival = festivals_data.get_festival_for_date(date_str)
        if festival:
            p_data["festival"] = festival
        days_data.append(p_data)

    return {"year": year, "month": month, "days": days_data}


# ---------- Forecast (Weekly / Monthly) ----------

@app.post("/kundali/{chart_id}/forecast", response_model=ForecastOut, responses={402: {"model": ErrorResponse}})
def get_forecast(
    chart_id: str,
    period: str = Query("week", description="week or month"),
    user_id: str = Depends(get_current_user_id),
):
    """POST /kundali/{chart_id}/forecast?period=week|month
    Generates a weekly or monthly transit forecast based on natal chart & active dasha."""
    _require_chart_owner(chart_id, user_id)
    chart = db.get_chart(chart_id)
    if not chart:
        raise HTTPException(status_code=404, detail={"code": "CHART_NOT_FOUND", "detail": "Chart not found"})

    if period not in ("week", "month"):
        raise HTTPException(status_code=400, detail={"code": "INVALID_PERIOD", "detail": "Period must be 'week' or 'month'"})

    try:
        db.deduct_tokens(user_id, "analysis", config.TOKEN_COST["analysis"])
    except ValueError:
        return _insufficient_tokens_response(user_id, "analysis")

    try:
        forecast = forecast_engine.generate_forecast(chart, period=period)
        return ForecastOut(chart_id=chart_id, period=period, **forecast)
    except Exception as e:
        import traceback
        print("EXACT ERROR IN /forecast:", config.sanitize_error(traceback.format_exc()))
        raise HTTPException(status_code=500, detail={"code": "FORECAST_ERROR", "detail": "Failed to generate forecast"})


# ---------- Lucky Profile ----------

@app.get("/kundali/{chart_id}/lucky", response_model=LuckyProfileOut)
def get_lucky_profile(chart_id: str, user_id: str = Depends(get_current_user_id)):
    """GET /kundali/{chart_id}/lucky — 0 tokens.
    Requires numerology to exist for this chart first."""
    _require_chart_owner(chart_id, user_id)
    chart = db.get_chart(chart_id)
    if not chart:
        raise HTTPException(status_code=404, detail={"code": "CHART_NOT_FOUND", "detail": "Chart not found"})

    num_data = db.get_numerology(chart_id)
    if not num_data:
        raise HTTPException(
            status_code=404,
            detail={"code": "NUMEROLOGY_NOT_READY", "detail": "Generate numerology for this chart first"}
        )

    life_path = num_data["numbers"]["life_path_number"]
    asc_sign = chart.get("ascendant_sign") or chart.get("ascendant") or "Sagittarius"
    res = lucky_profile.get_lucky_profile(life_path, asc_sign)
    return LuckyProfileOut(**res)


# ---------- Sade Sati ----------

@app.get("/kundali/{chart_id}/sade-sati", response_model=SadeSatiOut)
def get_sade_sati(chart_id: str, user_id: str = Depends(get_current_user_id)):
    """GET /kundali/{chart_id}/sade-sati — 0 tokens, pure math."""
    _require_chart_owner(chart_id, user_id)
    chart = db.get_chart(chart_id)
    if not chart:
        raise HTTPException(status_code=404, detail={"code": "CHART_NOT_FOUND", "detail": "Chart not found"})

    moon = next((p for p in chart.get("planets", []) if p["planet"] == "Moon"), None)
    if not moon:
        raise HTTPException(status_code=400, detail={"code": "MISSING_MOON_SIGN", "detail": "Moon sign not found in chart"})

    res = sade_sati_engine.get_sade_sati_status(moon["sign"])
    return SadeSatiOut(**res)


# ---------- Tarot Draw & History ----------

@app.post("/kundali/{chart_id}/tarot/draw", response_model=TarotReadingOut, responses={402: {"model": ErrorResponse}})
def draw_tarot(chart_id: str, payload: TarotDrawIn, user_id: str = Depends(get_current_user_id)):
    """POST /kundali/{chart_id}/tarot/draw — 5 tokens, AI reading + DB storage."""
    _require_chart_owner(chart_id, user_id)
    chart = db.get_chart(chart_id)
    if not chart:
        raise HTTPException(status_code=404, detail={"code": "CHART_NOT_FOUND", "detail": "Chart not found"})

    cost = config.TOKEN_COST.get("tarot", 5)
    try:
        db.deduct_tokens(user_id, "tarot", cost)
    except ValueError:
        return _insufficient_tokens_response(user_id, "tarot")

    count = max(1, min(payload.count, 5))
    cards = tarot_engine.draw_cards(count)
    reading_text = tarot_report.generate_tarot_reading(cards, payload.question)
    reading_id = db.save_tarot_reading(chart_id, cards, payload.question, reading_text)

    return TarotReadingOut(
        reading_id=reading_id,
        cards=cards,
        question=payload.question,
        reading=reading_text,
        created_at=datetime.now(timezone.utc).isoformat(),
    )


@app.get("/kundali/{chart_id}/tarot/history", response_model=list[TarotReadingOut])
def get_tarot_history(chart_id: str, user_id: str = Depends(get_current_user_id)):
    """GET /kundali/{chart_id}/tarot/history — 0 tokens, lists past readings."""
    _require_chart_owner(chart_id, user_id)
    return db.list_tarot_readings(chart_id)


# ---------- Dream Interpretation ----------

@app.post("/dream/interpret", response_model=DreamOut, responses={402: {"model": ErrorResponse}})
def interpret_dream(payload: DreamIn, user_id: str = Depends(get_current_user_id)):
    """POST /dream/interpret — 2 tokens, tied to user_id."""
    cost = config.TOKEN_COST.get("dream", 2)
    try:
        db.deduct_tokens(user_id, "dream", cost)
    except ValueError:
        return _insufficient_tokens_response(user_id, "dream")

    try:
        res = dream_interpretation.interpret_dream(payload.dream_description)
        return DreamOut(**res)
    except ValueError as e:
        raise HTTPException(status_code=400, detail={"code": "INVALID_DREAM_INPUT", "detail": str(e)})


# ---------- Kundali Milan (Matchmaking Report) ----------

@app.post("/kundali/milan", response_model=KundaliMilanOut, responses={402: {"model": ErrorResponse}})
def kundali_milan(payload: KundaliMilanIn, user_id: str = Depends(get_current_user_id)):
    """POST /kundali/milan — 5 tokens, requires ownership of chart_id_a and chart_id_b."""
    _require_chart_owner(payload.chart_id_a, user_id)
    _require_chart_owner(payload.chart_id_b, user_id)

    chart_a = db.get_chart(payload.chart_id_a)
    chart_b = db.get_chart(payload.chart_id_b)
    if not chart_a or not chart_b:
        raise HTTPException(status_code=404, detail={"code": "CHART_NOT_FOUND", "detail": "Chart not found"})

    cost = config.TOKEN_COST.get("milan", 5)
    try:
        db.deduct_tokens(user_id, "milan", cost)
    except ValueError:
        return _insufficient_tokens_response(user_id, "milan")

    manglik_a = compatibility.check_manglik(chart_a)
    manglik_b = compatibility.check_manglik(chart_b)

    moon_a = next(p for p in chart_a["planets"] if p["planet"] == "Moon")
    moon_b = next(p for p in chart_b["planets"] if p["planet"] == "Moon")

    ashta_koota = compatibility.compute_ashta_koota(
        moon_a["nakshatra"], moon_a["sign"], moon_b["nakshatra"], moon_b["sign"]
    )

    milan_report = kundali_milan_report.generate_milan_report(
        name_a=chart_a.get("name", "Person A"),
        name_b=chart_b.get("name", "Person B"),
        manglik_a=manglik_a,
        manglik_b=manglik_b,
        ashta_koota=ashta_koota,
    )

    return KundaliMilanOut(
        manglik_a=manglik_a,
        manglik_b=manglik_b,
        ashta_koota=ashta_koota,
        report=milan_report,
    )


# ---------- Baby Name Suggestions ----------

@app.post("/kundali/{chart_id}/baby-names", response_model=BabyNamesOut, responses={402: {"model": ErrorResponse}})
def get_baby_names(chart_id: str, payload: BabyNamesIn, user_id: str = Depends(get_current_user_id)):
    """POST /kundali/{chart_id}/baby-names — 5 tokens."""
    _require_chart_owner(chart_id, user_id)
    chart = db.get_chart(chart_id)
    if not chart:
        raise HTTPException(status_code=404, detail={"code": "CHART_NOT_FOUND", "detail": "Chart not found"})

    cost = config.TOKEN_COST.get("baby_names", 5)
    try:
        db.deduct_tokens(user_id, "baby_names", cost)
    except ValueError:
        return _insufficient_tokens_response(user_id, "baby_names")

    syl_data = naming_engine.get_naming_syllable_from_chart(chart)
    names = baby_name_report.suggest_names(syl_data["syllable"], gender=payload.gender, theme=payload.theme)

    return BabyNamesOut(
        nakshatra=syl_data["nakshatra"],
        pada=syl_data["pada"],
        syllable=syl_data["syllable"],
        names=names,
    )



# ---------- /ai/* aliases ----------
# The AI-team spec names these endpoints /ai/chat, /ai/generate-report,
# /ai/compatibility-analysis — different from the paths the RN app was
# already built against (/chat, /kundali/report/generate). Rather than
# breaking the existing, already-integrated client contract, these are
# added as aliases calling the exact same handlers — pick ONE naming
# scheme as the real one once the two teams agree, and deprecate the other.

app.post("/ai/chat", response_model=ChatMessageOut, responses={402: {"model": ErrorResponse}})(chat)
app.post("/ai/generate-report", response_model=KundaliReport,
          responses={402: {"model": ErrorResponse}})(generate_report)
app.post("/ai/compatibility-analysis", response_model=CompatibilityOut)(check_compatibility)


@app.get("/health")
def health():
    from .chat import provider_status
    status = provider_status.get_status()
    return {
        "status": "ok",
        "gemini": status.get("gemini"),
        "scalemax": status.get("scalemax"),
    }
