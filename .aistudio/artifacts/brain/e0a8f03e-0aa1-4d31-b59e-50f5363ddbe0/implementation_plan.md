# Real HTTP API Authentication & Live Bonus Fetch Engine

Transition the Pokies Bonus Radar from a seeded pseudo-random simulator to a real, live HTTP API authentication and promotion scraping engine using account phone numbers and passwords, complete with automated Cloudflare challenge and session expiration detection.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> - **Confirmed Fetch Method**: Direct HTTP API login with account phone and password.
> - **Confirmed Protection Strategy**: Auto-detect and visually flag Cloudflare Turnstile challenges, 401 unauthorized errors, and expired sessions.
> - **Engine Fallback & Testing**: A **Live Engine / Simulation Sandbox** mode toggle will be added to the Fetch Control Bar so you can verify live accounts against real casino servers while retaining the ability to test UI flows in simulated mode.
> - **Session Token Override**: An optional session cookie / token field in the Account Vault to bypass Cloudflare Turnstile challenges on domains that enforce strict client-side bot detection.

---

### 1. Overview & Core Concept

- **What It Does**: Sends real outbound HTTP(S) requests from the Node.js backend to casino authentication endpoints (e.g., SoftSwiss, Dama N.V., Hollycorn, and custom casino backends) using the user's stored phone/email and password. Upon successful authentication, it requests live user balance, withdrawable cash, and active promotions from each casino's promotions and bonus API endpoints.
- **Target Audience**: Users monitoring active promotional balances, cashback, and turnover terms across multiple online casino accounts.
- **Key Value**: Replaces mock/simulated numbers with genuine account balances, real available bonuses (> $0), and accurate turnover requirements directly from live casino accounts.

---

### 2. User Experience & Visual Design

- **Execution Flow**:
  1. User selects accounts in Account Vault and clicks **"Start Concurrent Fetch (Live Mode)"**.
  2. Workers dispatch real HTTP POST requests to each casino domain's authentication endpoint with user credentials.
  3. Real sessions are captured and queried for live wallet balances (`cash`, `minWithdrawal`, `maxWithdrawal`) and active bonuses (`litUpBonuses`).
  4. If a casino returns a Cloudflare Turnstile challenge (HTTP 403/503), the row is clearly tagged with a `Cloudflare Protected` alert and a direct link to the casino login page.
  5. If an account's session expires or credentials fail (HTTP 401), an amber `Session Expired` warning is surfaced with a 1-click retry affordance.
- **Visual Identity & Theme**:
  - Dark slate technical palette (`#09090C` canvas, `#12131A` elevated surface, `#1E1F2A` hairline borders).
  - High-intent semantic accents: Emerald (`#10B981`) for live authenticated bonuses, Amber (`#F59E0B`) for session expiration warnings, Rose (`#EF4444`) for authentication failures, Cyan (`#06B6D4`) for active workers and telemetry.
  - Zero-pill metadata discipline: clean unboxed text separated by typographic middots (`·`).
  - Monospace tabular figures (`tabular-nums`) for currency amounts, multipliers, and response times.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Direct HTTP Casino API Adapters**:
  - *Chosen Approach*: Implement platform-specific login adapters for popular casino platform engines (e.g., SoftSwiss `/api/users/sign_in`, Dama/Hollycorn `/auth/login`, standard REST endpoints) handling JSON and form payloads with realistic browser headers (`User-Agent`, `Accept`, `Referer`, `Origin`).
  - *Why*: Allows real, direct login without requiring heavy browser binaries (Puppeteer/Playwright) which are prohibited and incompatible with container execution rules.
  - *Alternative Considered*: Headless Chromium automation (rejected due to memory limits and container restrictions).

- **Decision 2: Automated Cloudflare & Bot Challenge Detection**:
  - *Chosen Approach*: Detect `cf-ray`, `cf-mitigated`, and challenge HTML tags on 403/503 responses, immediately classifying them as `cloudflare_challenge` with an explanation and direct link rather than hanging or silently failing.
  - *Why*: Provides transparent feedback so users know exactly why a specific domain blocked an automated script.

- **Decision 3: Dual Mode Toggle (Live Engine vs. Simulation Test Mode)**:
  - *Chosen Approach*: Include an explicit mode selector in the Fetch Control Bar (`Live HTTP Engine` vs `Simulation Sandbox`).
  - *Why*: Allows safe development, verification, and demoing without risking account lockout from rapid test runs.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│                   React SPA Frontend                   │
│  - Mode Toggle (Live API vs. Simulated Sandbox)        │
│  - Account Vault (Phone, Password, Optional Token)     │
│  - Live Bonus Grid with Real Balances & Alert Badges   │
└───────────────────────────┬────────────────────────────┘
                            │ SSE Stream / REST (/api/jobs)
┌───────────────────────────▼────────────────────────────┐
│                  Express Node.js Server                │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │               Worker Pool Dispatcher             │  │
│  │   - Concurrency manager (2x, 4x, 8x, 16x)        │  │
│  │   - Error recovery and retry scheduler           │  │
│  └──────────────────────────┬───────────────────────┘  │
│                             │                          │
│  ┌──────────────────────────▼───────────────────────┐  │
│  │              Casino HTTP API Engine              │  │
│  │   - Realistic browser header synthesis           │  │
│  │   - POST /api/users/sign_in (SoftSwiss / Dama)   │  │
│  │   - Cookie Jar & Bearer Token extraction         │  │
│  │   - GET /api/wallets & GET /api/bonuses          │  │
│  │   - Cloudflare Turnstile / 401 / 403 detector    │  │
│  └──────────────────────────┬───────────────────────┘  │
└─────────────────────────────┼──────────────────────────┘
                              │ Real Outbound HTTPS
                              ▼
        ┌──────────────────────────────────────────┐
        │       Real Online Casino Platforms       │
        │   (Skycrown, King Billy, Neospin, etc.)  │
        └──────────────────────────────────────────┘
```

- **Interactive State Transitions**:
  - `state = 'authenticating'`: Dispatches live credentials to target domain.
  - `state = 'scraping'`: Queries authenticated user profile, wallet balance, and promotions.
  - `state = 'success'`: Parses real cash balance, active bonuses (`amount > 0`), and computes turnover multipliers (`minWithdrawal / amount`).
  - `state = 'cloudflare_challenge'`: Renders warning badge with direct domain link to authenticate manually in browser.
  - `state = 'session_expired'`: Alerts user that credentials expired or require re-entry.
