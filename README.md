# 🌿 MittiSeva (మిట్టిసేవ) — Soil Health Analysis & Crop Advisor

MittiSeva is a free, localized soil health calculator and intelligent crop advisory system tailored specifically for farmers in **Andhra Pradesh & Telangana**. It empowers farmers with instant soil health scoring, customized fertilizer guidelines, suited crop selections, printable soil health certificates, and a localized AI chat assistant (**Krishi AI**) supporting **English (EN)**, **Telugu (తెలుగు)**, and **Hindi (हिंदी)**.

---

## 🚀 Features

*   **🔬 Interactive Soil Health Calculator**: Inputs for N, P, K, pH, moisture, and organic carbon via synchronized range sliders and inputs. Generates a dynamic 0-100 soil health score.
*   **🌱 Fertilizer recommendations**: Dynamic calculation of nitrogen, phosphorus, and potassium deficiencies with dosage tips.
*   **🌾 Crop Advisory**: Suggests optimal crop matches (e.g., Paddy, Groundnut, Cotton) and crop rotation strategies.
*   **💬 Localized Krishi AI Chat**: Multi-language conversational assistant powered by OpenRouter. Dynamically reads active soil stats to give highly personalized, contextual advice.
*   **📡 Smart Offline Fallback**: Detects OpenRouter connectivity issues or backend downtime and falls back to a local, offline keyword parsing engine so the farmer is never left without assistance.
*   **📋 Printable Health Reports**: Government-style soil test certificate generation with clean print layouts for PDF saving/printing.
*   **📊 Farmer Dashboard & History**: History logging synced with Supabase, plotting soil health score trends over time using Chart.js.
*   **🔐 Phone-Number-Based Secure Authentication**: Custom virtual email login scheme (`ms.farmer.<phone>@gmail.com`) allowing password-based login using phone numbers.

---

## 🛠 Tech Stack

### Frontend
*   **Core**: HTML5, Vanilla JavaScript (ES6+), Vanilla CSS3
*   **Database Client**: Supabase Client SDK (Loaded via CDN)
*   **Data Visualization**: Chart.js (Loaded via CDN)
*   **Localization**: Custom JS-based translator supporting English, Telugu, and Hindi

### Backend Proxy Server
*   **Runtime**: Node.js (ES Modules, `"type": "module"`)
*   **Framework**: Express.js
*   **Middleware**: CORS, Dotenv
*   **Routing**: Proxy stream endpoint at `/api/chat/stream` targeting OpenRouter AI API endpoints

### Database & Auth
*   **Database**: PostgreSQL hosted on Supabase Cloud
*   **Auth Provider**: Supabase Auth (Virtual phone-to-email scheme)
*   **Security**: Row Level Security (RLS) policies ensuring data isolation per farmer profile.

---

## 📂 Project Structure

```text
mittiseva/
├── api/
│   └── index.js             # Express API server & OpenRouter stream proxy
├── public/
│   ├── index.html           # Main frontend SPA markup
│   ├── mittiseva.css        # Vanilla CSS styling & responsive stylesheet
│   ├── mittiseva.js         # Core frontend app logic, router, translation, form handling
│   ├── ai_engine.js         # Krishi AI chat implementation & offline fallback engine
│   └── config.js            # Supabase client credentials & initialization
├── server.js                # Local server entry point (boots proxy)
├── supabase_schema.sql      # Database schema creation, RLS, & triggers
├── package.json             # NPM dependencies & boot script configurations
└── .env                     # Server environment variables
```

---

## ⚡ Getting Started (Local Development)

### 1. Prerequisites
Ensure you have [Node.js (v18+)](https://nodejs.org) and `npm` installed.

### 2. Install Dependencies
Clone the repository and run:
```bash
npm install
```

### 3. Setup Environment Variables
Create a `.env` file in the root directory:
```env
PORT=5000
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

### 4. Database Setup (Supabase)
1. Create a new project on [Supabase](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase Dashboard and run the contents of [supabase_schema.sql](file:///e:/imagesssss/supabase_schema.sql). This will set up the:
   - `profiles` table
   - `soil_tests` table
   - `chat_messages` table
   - Required Row Level Security (RLS) policies
   - Auto-profile generation trigger on signup
3. Copy your project's **Project URL** and **Anon API Key** from project settings.
4. Update the credentials in [public/config.js](file:///e:/imagesssss/public/config.js):
   ```javascript
   const SUPABASE_URL = "https://your-project-id.supabase.co";
   const SUPABASE_ANON_KEY = "your-anon-key";
   ```

### 5. Run the Project
Start both the frontend static server (port `8000`) and the backend proxy (port `5000`) concurrently by running:
```bash
npm run dev
```
Open [http://localhost:8000](http://localhost:8000) in your browser to test the app.

---

MY DEPLOYMENT LINK : https://soilhealth-analysis.vercel.app/
