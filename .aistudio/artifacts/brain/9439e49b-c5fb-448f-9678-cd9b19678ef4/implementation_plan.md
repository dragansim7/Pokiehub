# Private Multi-Account Pokies Bonus Fetcher Dashboard

A dedicated private operations dashboard to fetch, audit, and track available active bonuses across multiple accounts concurrently, replicating the exact scraping structure, account handling, and dashboard view from `bestpokieslist.online`—focused strictly on currently available, lit-up (non-greyed-out) promotions with values > 0.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> **Revised Requirement (Claiming Excluded)**:
> - **No Bonus Claiming**: All automated bonus claiming and one-click claim buttons have been removed.
> - **Lit-Up / Active Filter (> 0)**: The engine inspects promotions and only surfaces active, non-greyed-out bonuses where the bonus amount is greater than 0.
> - **Account Vault & Multi-Account Concurrency**: Retains the account vault with CSV import/export, fallback phone/password chains, and adjustable parallel worker concurrency.
> - **Direct Casino Navigation**: Provides clean direct links to launch the specific casino's promotion page for manual review or play without automated claim scripts.

---

## 1. Overview & Core Concept

### What It Does
The application connects to casino platforms across multiple user accounts simultaneously, querying each account's wallet and promotions hub. It scans for currently redeemable, lit-up promotional bonuses (`commission`, `share`, `referral`, `new`/signup, `rebate`, and active event promotions), verifying they are non-greyed-out and strictly greater than $0. It calculates turnover wagering requirements (`minWithdrawal / amount`), isolates errors or session expiry, and aggregates active bonus liquidity into a clean, scannable terminal view.

### Target Audience & Persona
Operators and players managing multiple accounts who need a consolidated, real-time radar of which casinos have active, non-zero promotional balances waiting.

### Key Value
- **Zero Noise / Pure Lit-Up Filter**: Automatically filters out $0 balances, expired promotions, and locked/greyed-out cards so operators only see actionable balances.
- **Concurrent Account Scraping**: Checks 10, 50, or 100+ accounts in parallel threads rather than tedious sequential manual checks.
- **Turnover & Cashout Intelligence**: Instantly sorts active bonuses by the lowest wagering hurdle for optimal withdrawal efficiency.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Account Vault & Credential Configuration**:
   - The user opens the **Account Vault** drawer to manage credentials.
   - Supports single entry or bulk CSV upload with fallback phone/password pairs (`phone,password,fallbackPhone2,fallbackPassword2,...`).
   - Accounts can be individually toggled or selected in bulk.
2. **Concurrent Fetch Execution**:
   - The user sets concurrency level (e.g., 2x, 4x, 8x, 16x) and clicks **"Start Concurrent Fetch"**.
   - Real-time progress updates show accounts checked, active worker threads, errors encountered, and lit-up bonuses discovered.
   - Fast retry button for failed accounts or expired sessions.
3. **Lit-Up Bonus Radar & Filtering**:
   - The main data grid displays only active, lit-up bonuses with amount > $0 (with a toggle to view empty accounts or errors if needed for auditing).
   - Filter by promotion category: *All Active*, *Signup / New*, *Commission*, *Share*, *Referral*, *Rebate*, or *Event Promos*.
   - Sort by *Lowest Turnover Ratio*, *Highest Bonus Amount*, *Cash Balance*, or *Domain*.
4. **Direct Casino Launch & Audit Export**:
   - Operator clicks **"Open Casino"** to launch the site in a new tab directly at the promotions URL for manual play.
   - One-click **"Export Active Bonuses (CSV)"** saves the current snapshot of all active bonuses with account tags and turnover requirements.

### Visual Identity & Theme
- **Aesthetic Direction**: High-density operational dark terminal (`#0B0B0E` background, `#121217` panel surfaces, `#1E1E26` hairline borders).
- **Domain Styling**: Faithful to `bestpokieslist.online`'s cyber-neon dark palette, upgraded with clean typographic hierarchy and zero AI slop (no decorative pulsing dots, no pill badge sandwiches).
- **Typography & Tabular Numerals**:
  - Headings: `Plus Jakarta Sans`.
  - Body: `Public Sans`.
  - Numbers, Balances, & Ratios: Monospace tabular numerals (`JetBrains Mono` / `tabular-nums`) ensuring vertical column alignment.
- **Color Distribution (60-30-10)**:
  - 60% Neutral Canvas: `#09090C`.
  - 30% Structural Panels: `#13131A` cards, `#1C1C26` headers, `#282836` dividers.
  - 10% Accents: `#00E5FF` (cyan primary for active fetch), `#10B981` (emerald for lit-up bonus > 0), `#F59E0B` (amber for turnover ratio), `#EF4444` (crimson for auth errors).

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Strict Lit-Up Filter (`amount > 0` & `isAvailable = true`)
- **Chosen Approach**: The fetcher categorizes each promotion status. By default, the dashboard view strictly isolates lit-up, non-greyed-out bonuses with positive value. A secondary tab ("All / Empty") preserves visibility into zero-balance accounts without cluttering the primary operational radar.
- **Why**: Directly addresses the user's requirement to surface only actionable, non-zero promotional balances.

### Decision 2: Elimination of Automated Claim Functionality
- **Chosen Approach**: All claiming scripts, claim API endpoints, and claim buttons are completely omitted. In their place, direct link actions allow the operator to visit the casino site cleanly if desired.
- **Why**: Perfectly aligns with the user's revised request while removing any unintended automated transaction risks.

### Decision 3: Server-Side Concurrent Worker Pool with Local Fallback Engine
- **Chosen Approach**: Node/Express server runs parallel job workers handling cookie persistence, session verification, user-agent rotation, and fallback credential chains.
- **Why**: External casino domains block client-side browser cross-origin requests (CORS). The server-side proxy worker ensures dependable fetching across multiple accounts.

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                          OPERATOR CLIENT (Vite + React)                │
│                                                                        │
│  ┌───────────────────────┐  ┌────────────────────────────────────────┐ │
│  │   Credential Vault    │  │       Top Bar & KPI Summary Strip       │ │
│  │  - Multi-Account List │  │  - Lit-Up Bonuses (>0)  - Total Value  │ │
│  │  - CSV Import/Export  │  │  - Accounts with Bonus  - Best Turnover │ │
│  │  - Fallback Chains    │  └────────────────────────────────────────┘ │
│  └──────────┬────────────┘                                             │
│             │                                                          │
│             ▼                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │             Live Fetch Control & Concurrency Bar                  │ │
│  │  [Concurrency: 2x/4x/8x]  [Start Fetch]  [Retry Errors] [Export]  │ │
│  └──────────────────────────────────┬────────────────────────────────┘ │
│                                     │                                  │
│  ┌──────────────────────────────────▼────────────────────────────────┐ │
│  │            High-Density Lit-Up Pokies Bonus Data Grid             │ │
│  │  - Filter: Lit-Up Only (>0) vs All Accounts                       │ │
│  │  - Category Filter: All / Signup / Commission / Share / Rebate    │ │
│  │  - Domain · Account · Bonus Type · Value · Turnover · Open Site   │ │
│  │  - Tabular Numerals · Sort by Lowest Turnover / Value / Domain    │ │
│  └──────────────────────────────────┬────────────────────────────────┘ │
└─────────────────────────────────────┼──────────────────────────────────┘
                                      │ HTTP / Server-Sent Events (SSE)
                                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   BACKEND ENGINE (Node / Express Server)               │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                      /api/jobs Queue Manager                     │  │
│  │  - Parallel Account Dispatcher (Configurable Concurrency Pool)   │  │
│  │  - Fallback Credential Fallback Logic (Phones 1 -> 2 -> 3 -> 4)  │  │
│  │  - Live Status Streaming (Queued -> In Progress -> Complete)     │  │
│  └──────────────────┬───────────────────────────────────────────────┘  │
│                     │                                                  │
│                     ▼                                                  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │              Casino Scraper & Promotions Inspector               │  │
│  │  - Session Auth & Token Verification                             │  │
│  │  - Promotions Parser: Detects Lit-Up vs Greyed-Out Status        │  │
│  │  - Bonus Filter: Extracts only amounts > 0                        │  │
│  │  - Turnover Evaluator: Calculates minWithdrawal / amount          │  │
│  │  - Fallback Cluster & Mock Casino Suite for Resilient Sandbox    │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### Data Model & State Entities
```typescript
export interface LitUpBonus {
  type: 'commission' | 'share' | 'referral' | 'signup' | 'rebate' | 'promotion';
  label: string;
  amount: number;             // Strictly > 0
  minWithdrawal: number;
  maxWithdrawal: number;
  minBet?: number;
  turnoverRatio: number;      // minWithdrawal / amount
  isLitUp: boolean;           // Non-greyed out
  promoExpiresAt?: string;
}

export interface AccountBonusRecord {
  accountId: string;
  accountPhone: string;
  accountLabel: string;
  domain: string;
  casinoIdentity: string;
  cashBalance: number;
  litUpBonuses: LitUpBonus[]; // Only bonuses where isLitUp=true and amount > 0
  totalLitUpAmount: number;
  bestTurnoverRatio: number;
  fetchState: 'success' | 'empty' | 'error';
  errorType?: string;
  errorReason?: string;
  httpCode?: number;
  fetchedAt: string;
}
```

### Interactive State Transitions & Handlers
- **Start Fetch**: Sends account batches to `/api/jobs` with specified concurrency. Real-time progress updates active worker threads and lit-up counts.
- **Promotion Detection**: Backend and client enforce `isLitUp === true && amount > 0` before adding to the active bonus ledger.
- **Filter & Sort**: Instant memoized filters (All, Commission, Share, Referral, Rebate, Signup) and sorts (Lowest Turnover first, Highest Value first).
- **Direct Link**: Opens `https://[domain]` with one click in a secure new tab.
- **Export CSV**: Formats the active lit-up bonuses into a clean CSV download containing account details, domain, bonus types, amounts, and turnover requirements.
