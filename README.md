# AstroGPT / KundaliGPT

This repository contains the AstroGPT / KundaliGPT application modules:

- **`mobile-app/`** — React Native (Expo) client-side mobile application. See [mobile-app/README.md](file:///d:/MobileApps/AI%20astro/mockup%201.0/mobile-app/README.md) for installation and styling guidelines.
- **`middleware/`** — FastAPI backend middleware utilizing `pyswisseph` (Swiss Ephemeris) calculations, Google Gemini API report generation/chat counselor, and NLLB-200 translation services. See [middleware/README.md](file:///d:/MobileApps/AI%20astro/mockup%201.0/middleware/README.md) for API setup.

---

## Running the Projects

You can run each project independently:

### 🐍 Middleware Backend
```bash
cd middleware
# Install python dependencies (venv recommended)
pip install -r requirements.txt
# Start the FastAPI reload server
uvicorn app.main:app --reload
```

### 📱 React Native Mobile App
```bash
cd mobile-app
# Install npm packages
npm install
# Start the Expo developer client
npx expo start
```
