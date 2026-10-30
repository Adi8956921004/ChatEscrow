# ChatEscrow — AI-Powered Milestone Payment Protection

> **Hackathon Prototype** built for the PayPal AI Challenge.  
> ChatEscrow converts informal client–freelancer chat conversations into structured project agreements, connects to PayPal Sandbox checkout, tracks milestone deliverables/evidence, and leverages AI to assess submitted work against agreed acceptance criteria.

---

## 1. Product Vision

Freelancers and clients often agree on work through informal messaging apps. Crucial project terms—scope, delivery dates, revision limits, acceptance criteria, and payment conditions—often remain ambiguous, causing disputes and delayed payments.

**ChatEscrow** bridges this gap:
1. **Chat-to-Contract AI:** Parses chat transcripts to extract project scope, deliverables, milestones, deadlines, and acceptance criteria into an editable contract draft.
2. **Mutual Agreement:** Both client and freelancer must review and approve the identical contract version before work and payment steps proceed.
3. **PayPal Sandbox Checkout:** Backend-orchestrated order creation and verified capture using the official PayPal REST API.
4. **AI Acceptance Gate:** Analyzes submitted deliverables against agreed criteria, highlighting met requirements, gaps, uncertainties, and recommendations.
5. **Milestone Payment Workflow:** Keeps transparent milestone ledgers and an auditable event timeline.

---

## 2. Financial Boundary & Escrow Notice

> [!IMPORTANT]
> **Prototype Financial Boundary:** This hackathon prototype does **not** provide legally regulated escrow services. Standard PayPal Checkout does not automatically freeze or escrow funds until milestone approval. ChatEscrow provides a **milestone payment protection workflow prototype**. Funds captures are verified through PayPal REST APIs, while milestones and internal release statuses are managed transparently within the ledger.

> [!NOTE]
> **Demo Roles, Not Authentication:** Role-based access control in this prototype is handled via static demo Bearer tokens (`client-demo-token` and `freelancer-demo-token`). These tokens facilitate UI role switching between Client (Sarah Miller) and Freelancer (Alex Carter) personas for demonstration purposes; they represent **demo roles, not authentication**.

---

## 3. Architecture & Tech Stack

```text
┌────────────────────────────────────────────────────────┐
│             Frontend (React 19 + TypeScript)           │
│  • Dashboard  • AI Contract Builder  • Mutual Approval │
│  • Milestone Evidence  • AI Acceptance Gate  • Timeline │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP / REST
┌──────────────────────────▼─────────────────────────────┐
│          Backend (Spring Boot 3.2.5 + Java 17)         │
│  • Contract & Milestone State Machine                  │
│  • AI Service (Gemini API with fallback demo mode)     │
│  • PayPal Service (OAuth 2.0, Order Creation & Capture)│
│  • H2 In-Memory Database (Seeded Demo Scenario)        │
│  • Auditable Event Log & Webhook Handler               │
└────────────────────────────────────────────────────────┘
```

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS tokens
- **Backend:** Spring Boot 3.2.5, Java 17, Spring Data JPA, WebFlux WebClient, H2 Database, Lombok
- **AI Integration:** Google Gemini (defaults to `gemini-2.0-flash`, with runtime fallback to `gemini-1.5-flash` if unavailable; configurable via the `AI_MODEL` environment variable). In absence of an `AI_API_KEY`, a built-in deterministic demo extractor and evaluator runs offline.
- **Payment Integration:** PayPal Sandbox REST API (`/v1/oauth2/token`, `/v2/checkout/orders`, `/v2/checkout/orders/{id}/capture`)

---

## 4. Quick Start Guide

### Prerequisites
- Java JDK 17+ installed
- Apache Maven 3.9+ installed (or present in PATH)
- Node.js 18+ and npm installed

### Step 1: Start the Backend
```powershell
cd backend
mvn clean compile
mvn spring-boot:run
```
The backend starts on `http://localhost:8080`.  
- H2 Console: `http://localhost:8080/h2-console` (JDBC URL: `jdbc:h2:mem:chatescrow`, User: `sa`, Password: empty)
- On startup, the backend automatically seeds a complete demo project with milestones, contract version, and audit events.

### Step 2: Start the Frontend
```powershell
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

> **Port Configuration:** The standard local Vite development server listens on port **5173** (`http://localhost:5173`). If `$PORT` is set, Vite listens on that port instead (for example **8443** in a container). The backend CORS policy permits both `http://localhost:5173` and `http://localhost:8443`.

> **H2 Console** (optional): By default the H2 console is **disabled**. To enable it for a session, set the environment variable `H2_CONSOLE_ENABLED=true` before starting the backend, then open `http://localhost:8080/h2-console` (JDBC URL: `jdbc:h2:mem:chatescrow`, User: `sa`, Password: empty).

---

## 5. Environment Variables (`.env`)

Copy `.env.example` to `.env` to configure your credentials:

```dotenv
# Server
APP_BASE_URL=http://localhost:8080

# AI Provider (Google Gemini)
AI_API_KEY=your-gemini-api-key
AI_MODEL=gemini-2.0-flash
AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta

# PayPal Sandbox — BACKEND ONLY (never exposed to frontend)
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com
PAYPAL_CLIENT_ID=your-sandbox-client-id
PAYPAL_CLIENT_SECRET=your-sandbox-client-secret
PAYPAL_WEBHOOK_ID=your-webhook-id
PAYPAL_ENABLE_PAYOUTS=false

# Frontend public config
VITE_API_BASE_URL=http://localhost:8080
VITE_PAYPAL_CLIENT_ID=your-sandbox-client-id
```

*Note: `VITE_PAYPAL_CLIENT_ID` is used by the frontend to render the PayPal Sandbox checkout buttons. If `AI_API_KEY` or `PAYPAL_CLIENT_ID` are not configured, ChatEscrow operates in guided Demo Mode, displaying real schemas, simulated evaluations, and 1-Click Demo Ledger deposits without crashing.*

---

## 6. 2-Minute Demo Script for Evaluators

1. **Start the app:** Ensure backend (`mvn spring-boot:run`) on `http://localhost:8080` and frontend (`npm run dev`) on `http://localhost:5173` are running.
2. **Observe Role Dashboards (30s):**
   - In the top bar, toggle between **Client (Sarah)** and **Freelancer (Alex)**.
   - Notice that the **Client Dashboard** shows action items for funding and reviewing, while the **Freelancer Dashboard** focuses on task deliverables and upcoming milestones. The sidebar navigation filters out builder and funding options for the freelancer.
3. **Fund a Milestone into Escrow (30s):**
   - As **Client**, click **Milestone Funding & Checkout** in the sidebar.
   - Use the **1-Click Demo Milestone Deposit** (or real PayPal Sandbox checkout) to record verified milestone funds into the ledger.
   - Switch to **Freelancer** view: note that funding controls are hidden; the freelancer sees protected payment records and ledger entries.
4. **Submit Work & Run AI Acceptance Gate (40s):**
   - As **Freelancer**, navigate to **AI Work Review**.
   - Fill in deliverable descriptions and proof links (or click quick presets) and click **Submit Evidence for Review**.
   - Click **Run AI Review**. Observe the structured AI Acceptance Report assessing submitted work against each agreed milestone acceptance criterion with Met/Partially Met/Not Met status and confidence ratings.
5. **Client Decision & Payout Release (20s):**
   - Switch role to **Client (Sarah)** on the **AI Work Review** page.
   - Review the AI findings, add optional notes, and click **Accept Milestone**.
   - Click **Authorize Payout Release** to release the verified funds to the freelancer's registered email.
   - Click **Export Evidence & Dispute Pack** to preview the complete tamper-evident audit package.

---

## 7. Known Limitations

- **Simulated Payouts Default:** PayPal Payouts API requires a verified business account with Payouts permissions enabled by PayPal. By default, `PAYPAL_ENABLE_PAYOUTS=false`, and payout authorizations produce transparently marked `DEMO_SIMULATED` payout records.
- **In-Memory H2 Database:** The prototype uses an in-memory H2 database (`jdbc:h2:mem:chatescrow`) that re-seeds on server restart. In production, configure PostgreSQL or MySQL via Spring datasource properties.
- **Demonstration Tokens:** Role-based access control uses static demo Bearer tokens (`client-demo-token` and `freelancer-demo-token`) allowing judges to easily switch personas in a single browser window. In production, integrate OAuth 2.0 / JWT session authentication.

---

## 8. End-to-End User Journey

1. **Dashboard:** View active projects, overall progress, milestone payment ledger, and recent activities.
2. **Contract Builder:** Paste raw client–freelancer conversations. The AI extracts deliverables, milestones, deadlines, and assumptions, flagging incomplete items for human review.
3. **Mutual Agreement:** Toggle between **Demo Client** and **Demo Freelancer** views. Both parties review and approve the exact same contract version.
4. **PayPal Checkout & Capture:** Create PayPal orders server-side with verified amounts, complete sandbox buyer checkout, and execute backend order capture to verify `CAPTURED` status.
5. **Milestone Evidence Submission:** The freelancer submits work deliverables (descriptions, external links, and files).
6. **AI Acceptance Gate:** The AI evaluates deliverables against agreed acceptance criteria with Met/Partially Met/Not Met status and reasoning.
7. **Client Decision:** The client reviews the evaluation and chooses to **Accept**, **Request Revision**, or **Flag Disagreement**.
8. **Authorized Release Workflow:** Once a milestone is accepted, the client explicitly authorizes the payout release (PayPal Payouts or simulated demo release).
9. **Evidence & Dispute Pack:** Export or inspect the assembled contract terms, criteria, submissions, AI findings, and verified payments for neutral dispute resolution.
10. **Auditable Timeline:** Complete audit timeline logging every critical action, timestamp, and party involvement.

---

## 9. Running Tests

To run the automated backend test suite covering the entire user journey:
```powershell
cd backend
mvn test
```

To run the automated end-to-end browser test with real unseen data:
```powershell
cd frontend
node test_browser_flow.mjs
```
