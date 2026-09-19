# AstroGPT / KundaliGPT Mobile Client (Mockup 1.0)

Welcome to the client-side repository for AstroGPT / KundaliGPT. This application is built as a premium, high-end Vedic astrology mobile product using **React Native + TypeScript (Expo managed workflow)**. It is designed to stand alongside top-tier consumer products like Calm, Headspace, and Co-Star.

This document serves as a bridge for the AI and engineering teams to understand the project architecture, state models, data contracts, and integration requirements.

---

## 🌌 Project Overview & Key Features
1. **Vedic Kundali Casting:** Casts precise birth charts. Renders a programmatically generated North Indian style SVG chart containing house sign indices and planet locations that adapt dynamically to dark and light modes.
2. **AI-Driven Interpretations:** Features deep, structured paragraphs detailing soul path, career directions under Saturn, relationship karma, yogas (like Gajakesari and Budhaditya), and transit/dasha shift warnings.
3. **Conversational Spiritual Counseling:** A contextual chat interface. The chat is proactively seeded with a greeting referencing specific placements in the user's birth chart.
4. **Dual-Path Chart Generation:**
   - **Path A:** Form entry with name, date (YYYY-MM-DD), time (HH:MM), and a debounced (350ms) search-as-you-type city selector that queries coordinates.
   - **Path B:** Camera / PDF document uploader simulating multi-stage OCR extraction progress and confirming coordinates back to the user before charging tokens.
5. **Token Economy Ledger:** A global Zustand ledger and transaction history feed. Charges are server-authoritative (Chart = 5, OCR = 10, Chat Message = 2, Report = 5).
6. **Global Insufficient Tokens Gate:** A global Axios response interceptor that catches status `402 Payment Required` on *any* endpoint and automatically triggers the Paywall Modal without requiring individual view handling.
7. **Offline Caching & Recheck:** Utilizes SQLite (`expo-sqlite`) to query and store cached charts, reports, and chats. On opening the report screen, an on-mount fetch check ensures that reloading an already generated report costs **0 tokens**.
8. **Sandbox Payment Checkout:** Fully functional mock purchase flow featuring Zod validation, Luhn check algorithms, Card/UPI/Wallet tabs, and deterministic test outcomes (cards ending in `4242` trigger a custom Reanimated falling confetti success, and cards ending in `0000` trigger simulated issuer declines).

---

## 🛠️ Technology Stack
- **Core:** Expo v57 (TypeScript), React Native
- **Navigation:** React Navigation v7 (Native Stack + Bottom Tab Bar)
- **State Management:** Zustand (Session store, Token store, Chart & Chat stores)
- **Server Cache:** TanStack Query (React Query v5) & Axios
- **Form Validation:** React Hook Form & Zod
- **Animations:** React Native Reanimated v4 (spring-pulsing coin badges, falling confetti particles, slide-in text bubbles)
- **Icons & Graphics:** Lucide Icons (`lucide-react-native`) and Native SVG (`react-native-svg`)
- **Persistence:** `expo-secure-store` (for JWT credentials) & `@react-native-async-storage/async-storage` (for theme/onboarding flags)

---

## 📂 Folder Structure

```
mockup 1.0/
├── App.tsx                     # Entry Point. Hooks theme, navigation context, query clients, and global PaywallModal
├── app.json                    # Expo configurations (permissions, app details)
├── package.json                # Dependency locks & scripts
├── tsconfig.json               # Strict compiler flags
│
├── assets/
│   └── fonts/                  # Bundled Outfit-Bold and Inter TTF assets
│
└── src/
    ├── api/
    │   ├── client.ts           # Axios client instance with Bearer token injections, 401 & 402 interceptors
    │   ├── types.ts            # Strict TS interfaces matching backend schema models (User, Chart, Report, etc.)
    │   └── endpoints/
    │       ├── auth.ts         # User registration (POST /auth/register) and account deletion stubs
    │       ├── tokens.ts       # Balance, ledger history, and purchase (POST /tokens/purchase) stubs
    │       ├── kundali.ts      # Birth details calculation, OCR document uploading, and city autocomplete stubs
    │       ├── report.ts       # Separated generateReport (POST) and fetchReport (GET) stubs
    │       └── chat.ts         # Contextual AI chat response synthesis stubs
    │
    ├── components/             # Reusable UI Atoms
    │   ├── Button.tsx          # Animated scaling + primary/secondary/ghost/danger states + spinner
    │   ├── TextInput.tsx       # Floating borders + password visibility + custom left icons
    │   ├── Card.tsx            # Elevated glassmorphism blocks
    │   ├── LoadingState.tsx    # Full-screen Activity Indicators with spiritual copywriting
    │   ├── EmptyState.tsx      # Illustrations + call-to-action buttons
    │   ├── ErrorState.tsx      # Retry layout blocks
    │   └── TokenBadge.tsx      # Pulsing spring header token tracker
    │
    ├── config/
    │   └── tokenPlans.ts       # Token packages config (Star, Constellation, Galaxy) as single source of truth
    │
    ├── db/                     # Offline Persistence
    │   ├── schema.ts           # SQLite create table queries for cached_charts, cached_reports, cached_chats
    │   └── localCache.ts       # DB access wrapper + Memory Map fallback logic
    │
    ├── hooks/
    │   ├── useTokenGate.ts     # Hook to check balance and interrupt actions with a paywall trigger
    │   └── useChartPolling.ts  # Hook to poll slow calculations at intervals
    │
    ├── navigation/             # Routing Setup
    │   ├── RootNavigator.tsx   # Decides stack showing: Onboarding -> AuthStack -> MainTabs -> Checkout Stacks
    │   ├── AuthStack.tsx       # Login, Sign Up, and OTP verification stacks
    │   ├── MainTabs.tsx        # Dashboard, Interpretations, Counseling, Wallet, and Settings
    │   └── types.ts            # Navigation parameter typings
    │
    ├── screens/
    │   ├── onboarding/
    │   │   └── OnboardingScreen.tsx # 3-stage swipe introduction with vector graphics
    │   ├── auth/
    │   │   ├── SignUpScreen.tsx    # Email & Phone tabs, Zod validations, Google/Apple social sign-ins
    │   │   ├── LoginScreen.tsx     # Credential checks & validation
    │   │   └── OtpVerifyScreen.tsx # SMS verification code countdown timers
    │   ├── home/
    │   │   └── DashboardScreen.tsx # Casted chart summary, current active dasha nodes, cosmic shortcuts
    │   ├── birthData/
    │   │   ├── BirthDataFormScreen.tsx # coordinate autocomplete place search with 350ms debouncer
    │   │   └── DocumentUploadScreen.tsx # OCR photo upload progress bar + confirm-details validation
    │   ├── chart/
    │   │   ├── ChartScreen.tsx     # Integrated Kundali view page
    │   │   └── components/
    │   │       ├── ChartSvgRender.tsx # Dynamic SVG renderer substituting color tokens per active theme
    │   │       ├── PlanetCards.tsx    # Planetary signs, degrees, house, and retrograde badges
    │   │       └── DashaTimeline.tsx  # Horizontal timeline tracking active Antardashas
    │   ├── report/
    │   │   └── ReportScreen.tsx    # Collapsible Vedic interpretations with double-charge check
    │   ├── chat/
    │   │   └── ChatScreen.tsx      # Context-seeded AI chat + typing indicators
    │   ├── wallet/
    │   │   ├── WalletScreen.tsx    # Balance dial and transaction ledger logs
    │   │   ├── PaywallModal.tsx    # Pricing plans selection trigger
    │   │   ├── MockCheckoutScreen.tsx # Sandbox payment credentials capture with Luhn validations
    │   │   ├── PurchaseSuccessScreen.tsx # Reanimated Confetti falling celebration + token credit sync
    │   │   └── PurchaseFailureScreen.tsx # Card decline info + retry presets presets
    │   └── settings/
    │       └── SettingsScreen.tsx  # Profile data, notification alerts, languages, and confirm-twice deletion
    │
    └── theme/                  # Styling System
        ├── colors.ts           # Celestial HSL theme configurations (Dark and Light modes)
        ├── typography.ts       # Font scales, weights, and line heights
        ├── spacing.ts          # Radii, borders, and margins
        ├── ThemeProvider.tsx   # Persists theme choices to AsyncStorage + loads Outfit/Inter fonts
        └── index.ts            # Consolidated design token exports
```

---

## 📈 Integration Status & Current Progress

| Module / Component | Status | Implementation Detail |
| :--- | :--- | :--- |
| **Theme System** | **100% Complete** | Light & Dark celestial palettes. Custom Google Fonts (`Outfit-Bold` and `Inter` weights) load asynchronously on startup. |
| **Axios HTTP Client** | **100% Complete** | Token Bearer header injector + 401 re-auth clearance + 402 global paywall modal trigger. |
| **API Typings & Endpoints** | **100% Complete** | Clean TS interfaces; all endpoint queries stubbed with simulated server delays to mimic query loading states. |
| **Zustand State Stores** | **100% Complete** | Session, Token (ledger & paywall state), and Chart (active chart, reports, chats) stores are fully wired. |
| **Local Cache DB** | **100% Complete** | SQLite table queries and access routines are complete. Automatic memory fallback active when run on mock/web targets. |
| **Navigation Setup** | **100% Complete** | Auth flow, Onboarding stack, modal transitions, sandbox checkout stacks, and Bottom Tab Navigator. |
| **UI Components** | **100% Complete** | Button loaders, TextInputs, Card elevations, loading/empty/error states, and animated TokenBadges. |
| **User Screens** | **100% Complete** | All 15 premium screens (including checkout loop) are completed, styled, animated, and linked. |
| **Type Verification** | **Passed (Clean)** | Running `npx tsc --noEmit` completes with **0 compilation errors**. |

---

## 🔗 Bridge instructions for the AI / Backend Team
When integrating the real backend middleware (`/middleware` running FastAPI, pyswisseph, Gemini, and NLLB-200), focus modifications entirely on these locations:

1. **API Client Base URL:**
   In `src/api/client.ts`, update `API_BASE_URL` to point to your live deployment server or local development host:
   ```typescript
   const API_BASE_URL = 'https://api.yourdomain.com';
   ```

2. **Auth Header & Bearer Tokens:**
   Our client automatically checks SecureStore for `user_jwt_token` and inserts it as a Bearer authorization header (`Authorization: Bearer <token>`). Once the Firebase Auth verification is active, save the Firebase ID token under `user_jwt_token` during auth success.

3. **Endpoints Migration:**
   Replace the mock return payloads under `src/api/endpoints/` with standard Axios network calls. The API endpoints are pre-typed and return the correct TypeScript shapes:
   - **Cast Chart:** `kundali.ts` -> Calls `POST /kundali/generate` (spends 5 tokens).
   - **Upload Document:** `kundali.ts` -> Calls `POST /kundali/upload` (spends 10 tokens).
   - **Autocomplete Places:** `kundali.ts` -> Calls `GET /places/search?q=query` (debounced 350ms client-side).
   - **Generate Report:** `report.ts` -> Calls `POST /kundali/report/generate` (spends 5 tokens).
   - **Fetch Report (Free):** `report.ts` -> Calls `GET /kundali/report/{chartId}` (costs 0 tokens).
   - **AI Chat Message:** `chat.ts` -> Calls `POST /chat` (spends 2 tokens).
   - **Wallet balance:** `tokens.ts` -> Calls `GET /tokens/{userId}`.
   - **Purchase tokens:** `tokens.ts` -> Calls `POST /tokens/purchase` (passes planId). *Warning: Secure this endpoint behind webhook validation before production.*
   - **Account registration:** `auth.ts` -> Calls `POST /auth/register` to register the new Firebase User UID.

4. **Backend Response Conformity:**
   Ensure the backend responses returned by the FastAPI middleware match the schemas declared in `src/api/types.ts`. All endpoints that spend tokens must return the `tokens_remaining` field to allow the client store to automatically sync the token count.
