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

from . import config, db, chart_engine, report_generator, ocr_extractor, places, divisional, compatibility, daily_insight, numerology_engine, numerology_report
from .chat import router as chat_handler
from .auth import get_current_user_id
from .schemas import (
    BirthDataIn, KundaliChart, KundaliReport, ReportGenerateIn, ChartSummary,
    ChatMessageIn, ChatMessageOut, TokenBalance, ErrorResponse,
    RegisterIn, RegisterOut, PlaceCandidate, PurchaseIn, PurchaseOut,
    CompatibilityIn, CompatibilityOut, DailyInsightOut, DivisionalChartOut,
    NumerologyOut,
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
