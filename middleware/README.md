# AstroGPT / KundaliGPT Middleware

FastAPI middleware for the Vedic astrology app. Deterministic chart calculation
(pyswisseph) is fully separate from AI interpretation (Gemini) — the model never
computes planetary positions, only interprets structured data it's given.

## Architecture

```
React Native App
      │  JSON over HTTPS (fetch/axios)
      ▼
FastAPI middleware (this repo)
      │
      ├── chart_engine.py    → pyswisseph, deterministic, no AI
      ├── ocr_extractor.py   → Gemini vision, image/PDF → structured fields
      ├── report_generator.py→ Gemini, ONE-TIME per-user grounding report (Tier 1)
      ├── chat_handler.py    → Gemini, per-turn grounded chat (Tier 2)
      ├── translation.py     → NLLB-200
      └── db.py               → SQLite (sync this file to Drive if run in Colab)
```

## Setup

```bash
pip install -r requirements.txt
export GEMINI_API_KEY="your-key-here"
export ASTRO_DB_PATH="./astro.db"   # or your Drive-mounted path in Colab
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

In Colab, expose it publicly for the RN app during development with ngrok or
`google.colab.output` port forwarding, then swap in a real host before launch —
Colab notebooks aren't meant to be an always-on backend.

## API surface (React Native integration)

All endpoints return JSON. A `402` status means insufficient tokens — the RN app
should catch this specifically and show the buy-tokens popup, using the
`tokens_remaining` field in the error body to display the current balance.

| Method | Path                          | Cost (tokens) | Purpose                                    |
|--------|-------------------------------|---------------|---------------------------------------------|
| GET    | `/tokens/{user_id}`           | 0             | Check balance                              |
| POST   | `/kundali/generate`           | 5 (analysis)  | Path A: form input → chart                 |
| POST   | `/kundali/upload`             | 10 (upload)   | Path B: image/PDF → chart                  |
| POST   | `/kundali/{user_id}/report`   | 5 (analysis)  | Generate Tier-1 grounding report           |
| GET    | `/kundali/{user_id}/report`   | 0             | Fetch existing report                      |
| POST   | `/chat`                       | 2 (chat)      | Tier-2 grounded chat turn                  |

### Example: React Native calls

```javascript
// Path A — form submission
const res = await fetch(`${API_BASE}/kundali/generate`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_id: userId,
    name: 'Asha Verma',
    dob: '1998-03-12',
    time_of_birth: '14:45',
    place_of_birth: 'Pune, India',
  }),
});
if (res.status === 402) {
  const err = await res.json();
  showBuyTokensModal(err.tokens_remaining);
} else {
  const chart = await res.json();
}

// Path B — image/PDF upload
const form = new FormData();
form.append('user_id', userId);
form.append('file', { uri: pickedFile.uri, name: 'kundali.jpg', type: 'image/jpeg' });
const res = await fetch(`${API_BASE}/kundali/upload`, { method: 'POST', body: form });

// Chat
const res = await fetch(`${API_BASE}/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ user_id: userId, message: userInput, language: 'hi' }),
});
const { reply, tokens_remaining } = await res.json();
```

## Open items (flagged, not yet decided)

- **Token cost for `/kundali/generate` (Path A form entry):** your pricing plan
  only specified costs for upload (10), analysis (5), and chat (2) — form-based
  chart generation isn't a named bucket. This code currently charges it as
  "analysis" (5 tokens). Confirm that's what you want, or tell me the intended cost.
- **Token purchase flow:** `db.add_tokens()` exists as the landing point for a
  future payment webhook (App Store/Play Store IAP or Razorpay/Stripe) — not wired
  to a real payment provider yet, per your "do this later" note on the Antigravity piece.
- **Auth:** `user_id` is currently trusted as sent by the client. Before production,
  put this behind real auth (Firebase Auth / your own JWT) so one user can't spend
  another user's tokens by guessing their `user_id`.
