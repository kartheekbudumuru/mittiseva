# MittiSeva (మిట్టిసేవ) - Project Requirements & Specification

MittiSeva is a free soil health analysis and crop recommendation web application tailored for farmers in Andhra Pradesh and Telangana. It provides instant soil health scoring, customized fertilizer guidelines, suited crop selections, secure report downloads, and a smart, localized conversational AI (Krishi AI) to assist farmers in their regional languages.

---

## 1. System & Runtime Requirements

### Development & Build Environment
- **Node.js**: Version `18.x` or higher (Recommended: `20.x` LTS).
- **Package Manager**: `npm` (Version `9.x` or higher).
- **Operating Systems**: Cross-platform compatibility (Windows 10/11, macOS, Linux).

### Database & Auth Runtime
- **Supabase Cloud Service**: Database hosting and Authentication server.
- **Supabase Database Engine**: PostgreSQL 15+.
- **Authentication**: Virtual email login scheme linked directly to farmer phone numbers.

### Network & APIs
- **OpenRouter AI Gateway**: API endpoint access for conversational streaming.
- **Port Allocations**:
  - Frontend Server: Port `8000` (Local hosting static files).
  - Backend Proxy Server: Port `5000` (Local node proxy).

---

## 2. Technical Stack & Libraries

### Frontend Tech Stack
- **Structure & Layout**: Semantic HTML5, designed mobile-first with desktop layout responsive support.
- **Styling System**: Vanilla CSS3 (custom variables, flexbox/grid layouts, dynamic dot pagination, print media overrides).
- **Core Logic**: Vanilla JavaScript ES6 (Native DOM APIs, async/await).
- **Data Visualization**: **Chart.js** (v4.4.x) loaded via CDN for soil health histories.
- **Database Client**: **Supabase JavaScript Client SDK** (v2) loaded via CDN.

### Backend Proxy Tech Stack
- **Runtime Environment**: Node.js ES Modules (`"type": "module"`).
- **Core Web Framework**: **Express.js** (v4.19.x).
- **Cross-Origin Requests**: **CORS** middleware (v2.8.5).
- **Environment Management**: **dotenv** (v16.4.x).
- **Development Tooling**: **nodemon** (v3.1.x) for hot reloading.
- **Concurrency**: **concurrently** (v8.2.x) to boot frontend and proxy tasks together.

---

## 3. Functional Capabilities (Modules)

### A. Authentication & Profile Gate (Auth Module)
- **Email-less Phone Login**: Emulates standard mobile authentication by converting a user's 10-digit phone number into a virtual email (`ms.farmer.<phone>@gmail.com`).
- **Registration**: Captures Farmer's Full Name, Phone Number, Village, and Password.
- **Mandatory Redirect Guard**: Redirects unauthenticated page loads immediately to the authentication form before any landing or dashboard views are accessible.

### B. Soil Health Calculator (Analysis Module)
- **Accordion Inputs**: Collapsible card controls with synchronized input fields and range sliders for N, P, K, pH, Moisture, and Organic Carbon.
- **Scoring Algorithm**: Computes a dynamic soil score (0 to 100) using custom rules:
  - Balanced pH (6.0 - 7.5): 20 points
  - Optimal Nitrogen (280 - 560 kg/ha): 20 points
  - Optimal Phosphorus (25 - 50 kg/ha): 20 points
  - Optimal Potassium (108 - 280 kg/ha): 20 points
  - Moisture (40 - 70%): 10 points
  - Organic Carbon (> 0.75%): 10 points
- **Advisory Matching**: Matches inputs to optimal crop recommendations (Paddy, Groundnut, Cotton) and fertilizer deficiency advice.

### C. Krishi AI Chat (Conversational Module)
- **OpenRouter Secure Proxy**: Proxies requests via `/api/chat/stream` protecting API tokens. Utilizes fallbacks across models (`DeepSeek-V3`, `Qwen-32B`, `Llama-3.3`).
- **Context-Aware Prompting**: Automatically serializes profile info and soil metrics into prompt boundaries.
- **Offline / Server Fallback Mode**: Detects connection errors and switches to a local keyword parser providing instant, offline soil health summaries.
- **Multi-language Streaming**: Outputs real-time streaming SSE tokens in the active app language.
- **Suggestions Bar**: Injects interactive buttons containing quick questions in the farmer's active language.
- **Chat History Sync**: Persists up to 20 recent messages per user in the Supabase database.

### D. Soil Health Certificate & Dashboard (Reports Module)
- **Interactive Line Charts**: Renders soil health scores over time.
- **Record Management**: Allows adding new measurements and removing historical records.
- **Downloadable PDF Certificates**: Standardized government-style certificates detailing scores, soil metrics, and exact recommendations with print-ready css layout rules.
