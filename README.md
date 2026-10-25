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
```

*Note: If `AI_API_KEY` or `PAYPAL_CLIENT_ID` are not configured, ChatEscrow operates in guided Demo Mode, displaying real schemas and simulated evaluations without crashing.*

---

## 6. End-to-End User Journey

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

## 7. Running Tests

To run the automated backend test suite covering the entire user journey:
```powershell
cd backend
mvn test
```
