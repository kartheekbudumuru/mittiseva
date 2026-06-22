# MittiSeva - Master Project Prompt (Recreation Guide)

Below is the developer specification prompt you can feed to an AI coding assistant to recreate the **MittiSeva** soil analysis application from scratch.

---

```markdown
Build a comprehensive, production-ready web application named "MittiSeva" (మిట్టిసేవ) designed to assist farmers in Andhra Pradesh & Telangana with soil health analysis, crop planning, and agricultural advice in English, Telugu, and Hindi.

## 1. TECHNICAL STACK & ARCHITECTURE
- **Frontend**: Single-page application using HTML5, Vanilla CSS3 (curated forest green, gold, and cream palette), and Vanilla ES6 JavaScript. Use Chart.js (CDN) for history graphs and the Supabase JS SDK (CDN) for database queries.
- **Backend (API Proxy)**: Node.js Express server to host a secure API proxy at `/api/chat/stream` for OpenRouter API requests, masking the API key from the frontend client.
- **Database (Supabase)**: Establish tables for:
  - `profiles` (extends auth.users, stores full_name, village, phone).
  - `soil_tests` (stores numeric values of tests, dates, scores, linked to profiles).
  - `chat_messages` (persists history of farmer conversations with the AI, linked to profiles).
  Configure Row-Level Security (RLS) to ensure users can only access their own records.

## 2. FUNCTIONAL MODULES

### A. Authentication Gate & Profiles
- **Initial Redirect Gate**: When the site boots up, check the session. If the user is unauthenticated, redirect them immediately and silently to the Profile/Login page (`auth`).
- **Post-Login Redirect**: Once the farmer registers or logs in successfully, redirect them straight to the Home/Landing page (`landing`).
- **Phone Emulation**: Users register and log in using Full Name, Village, 10-digit Phone Number, and Password. Translate phone numbers internally to virtual email strings (`ms.farmer.<phone>@gmail.com`) for Supabase auth.
- **Profile View**: Display active user info with computed initials avatar, and a red Logout button which returns them to the auth gate.

### B. Soil Health Analysis Calculator
- **Inputs**: Accordion-style layout containing synchronized number input fields and range sliders for:
  - pH Level (ideal: 6.0 – 7.5)
  - Nitrogen (N) kg/ha (ideal: 280 – 560)
  - Phosphorus (P) kg/ha (ideal: 25 – 50)
  - Potassium (K) kg/ha (ideal: 108 – 280)
  - Moisture % (ideal: 40 – 70%)
  - Organic Carbon % (ideal: > 0.75%)
- **Formula Engine**: Compute a score out of 100 on the fly. Allocate points based on deviations from ideal thresholds, and map scores to status tags (Optimal, Medium, Low).
- **Result Displays**: Display calculated health score inside a colored SVG gauge, nutrient breakdown, fertilizer guidelines, and crop recommendations.

### C. Seasonal Crop Advisory Section
- Display a clean static "Seasonal Crop Advisory" card on the landing page containing:
  - Title: Seasonal Crop Advisory
  - Subtitle: Expert agricultural advice for AP & Telangana
  - Body: Guidelines suggesting rotation of cereals (Paddy) with legumes (Groundnut/Green Gram) to naturally replenish nitrogen and optimize Rabi/Kharif crop yields.

### D. Krishi AI Chat Assistant
- **AI Integration**: Chat client communicating via the backend proxy. Prompt the model to act as "Krishi AI" and respond in the farmer's active language.
- **Scrolling Feeds**: Ensure chat bubble additions and streaming chunks update the scroll container. Apply a `setTimeout` layout delay to `scrollTop = scrollHeight` so scroll heights include newly rendered text. Add 40px–60px bottom padding to containers to prevent input bar overlaps.
- **Suggestion Chips**: Display quick suggestions at the bottom of the conversation feed in the active language.
- **Offline Mode**: If the API call fails or times out, run a local JavaScript parser that reads the user's active soil test values and outputs a text summary of soil conditions, recommended crops, and fertilizer requirements.

### E. Health Reports & Dashboards
- **Dashboard**: Use Chart.js to render a line graph of historical health scores. Show metrics for Latest Score, Improvement, and Tests Done.
- **Government Certificate**: Render a printable, high-quality soil health certificate containing farmer/village details, score gauges, soil readings table, and recommended dosages, fitted with clean print layout rules.

## 3. GLOBAL TRANSLATION
- Build a custom translation router in JS that supports switching between English (EN), Telugu (తె), and Hindi (హి). Update page titles, buttons, prompts, and layout blocks dynamically.
```
