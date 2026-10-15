# ChatEscrow — AI-Powered Milestone Payment Protection

> **Project brief for Antigravity:** Build a working, end-to-end hackathon prototype that turns a client–freelancer conversation into an agreed project contract, connects a PayPal Sandbox checkout, tracks milestone evidence, and uses AI to help assess whether submitted work matches the agreed acceptance criteria.

## 1. Product vision

Freelancers and clients often agree on work in informal chats. The scope, delivery dates, revision limits, acceptance criteria, and payment conditions can remain unclear. This creates avoidable misunderstandings and payment disputes.

**ChatEscrow** converts the conversation into a structured agreement and makes milestone progress and payment status visible to both parties. It combines:

1. **Chat-to-Contract AI** — extracts scope, milestones, due dates, deliverables, and acceptance criteria from a conversation and creates an editable draft.
2. **Mutual agreement** — client and freelancer review and approve the same version of the contract before work/payment steps begin.
3. **PayPal Sandbox checkout** — demonstrates a real PayPal developer-platform integration in sandbox mode.
4. **AI Acceptance Gate** — compares submitted deliverables/evidence with the agreed milestone criteria and produces a transparent report with evidence, missing items, confidence, and recommended next steps.
5. **Milestone payment workflow** — tracks payment and release states, and explores PayPal Payouts only if sandbox access and recipient requirements can be met.

### Important wording and financial boundary

This hackathon prototype must **not claim that it provides legally regulated escrow or that PayPal Checkout automatically holds funds until a milestone is approved**. Public PayPal Checkout and Payouts APIs do not, by themselves, establish a guaranteed escrow/funds-holding facility. Implement only the verified capabilities available to the developer account.

- Use **PayPal Sandbox** for demo payments.
- Clearly distinguish a captured checkout payment, an internal milestone ledger/status, and a separate payout.
- Never display “funds are held in escrow” unless an approved PayPal product/partner arrangement truly supports that behavior and it has been verified.
- If actual hold-and-release capability is unavailable, describe the feature as a **milestone payment workflow / escrow-style protection prototype**, and make the limitation visible in the UI and demo.
- Do not move real customer funds or present the prototype as legal, financial, or dispute-resolution advice.

## 2. Primary user journey

Build this complete demo journey before adding secondary features:

1. A user creates a project and pastes a client–freelancer conversation or describes the work.
2. AI extracts a **draft contract**: project summary, deliverables, milestone amounts, due dates, acceptance criteria, revision allowance, and assumptions.
3. The user reviews and edits the draft. AI must not silently invent missing terms; mark them as “Needs confirmation”.
4. Client and freelancer approve the same contract version. For a single-user demo, provide clearly labelled **Demo Client** and **Demo Freelancer** views or test accounts. Do not treat one person's click as real consent from another person.
5. Client pays through PayPal Sandbox Checkout. The backend creates the order and captures it only through the approved PayPal flow.
6. Backend verifies the payment result using PayPal API responses and, where configured, a verified webhook event. Do not trust a frontend success redirect alone.
7. A freelancer submits a milestone deliverable or evidence (description, URL, and/or uploaded file if file upload is implemented).
8. AI Acceptance Gate compares the submission with the agreed criteria and returns a structured report: criterion-by-criterion result, supporting evidence, gaps, uncertainty, and recommended action.
9. Client reviews the report and explicitly accepts, requests revisions, or flags a disagreement. AI must not autonomously decide legal disputes or trigger a real payout solely from its own score.
10. Show an auditable timeline and the payment/milestone state. If PayPal Payouts is confirmed usable in the sandbox, demonstrate a separately authorised payout flow. Otherwise show a clearly labelled simulated release workflow—never a fake PayPal success.

## 3. Hackathon MVP scope

### P0 — Must work in the demo

- Create and view a project.
- Paste a conversation and generate an editable contract draft.
- Create milestone records and acceptance criteria.
- Save contract versions and record client/freelancer approval states.
- Integrate PayPal Sandbox Checkout using backend-created orders and backend capture/verification.
- Store payment state from verified provider responses.
- Submit milestone evidence.
- Generate an AI acceptance report with criterion-level reasoning and uncertainty.
- Let the client accept, request revisions, or flag a disagreement.
- Display a project timeline, milestone ledger, and payment status.
- Include sample/demo data and a README with setup steps.

### P1 — Add after P0 is stable

- Configure and test PayPal webhooks; verify webhook signatures using PayPal's verification flow/API.
- Explore PayPal Payouts Sandbox and confirm recipient/onboarding prerequisites. If it works, add an explicit, authorised payout action with idempotency protection and recorded provider status.
- Add notifications and downloadable contract/report summaries.
- Add a basic dispute/evidence pack that organises the agreement, timeline, submitted evidence, and approvals. Do not claim the system can predict or guarantee dispute outcomes.

### P2 — Research / future scope only unless access is confirmed

- True marketplace/multiparty escrow, delayed settlement, automatic hold/release, or other funds-control functionality requiring PayPal partner approval or a specific product.
- Real-money payments, production payouts, refunds, chargeback/dispute automation, legal e-signature, identity verification, and regulatory compliance.

Do not spend MVP time on P2 or make it a dependency for the hackathon demo.

## 4. Suggested architecture

Use the existing repository and stack if one is already present. **Inspect the current codebase before replacing files or choosing a new framework.** Preserve working features and explain any major change before making it.

Logical modules:

- **Frontend:** project dashboard, conversation input, contract editor, approvals, PayPal checkout, milestone submission, acceptance report, activity timeline.
- **Backend API:** project/contract/milestone workflows, AI orchestration, PayPal order creation/capture, webhook handling, audit events.
- **Database:** users/demo roles, projects, contract versions, milestones, submissions, AI reports, payment records, payout records, webhook events, audit timeline.
- **AI service:** structured contract extraction and milestone acceptance evaluation. Use the AI provider/configuration already present in the repository where possible.
- **PayPal adapter:** isolate API calls behind a service so credentials, sandbox base URL, order capture, webhook verification, and optional payouts are not mixed into controllers/UI.

### Conceptual flow

```text
Conversation
   ↓
AI Contract Draft → Human Review/Edit → Contract Version
   ↓                                  ↓
Mutual Approval                 Milestone Criteria
   ↓
PayPal Sandbox Checkout
   ↓
Backend Payment Verification ← PayPal Webhook (if configured)
   ↓
Milestone Ledger ← Freelancer Evidence Submission
   ↓
AI Acceptance Report
   ↓
Client Decision: Accept / Request Revision / Flag Disagreement
   ↓
Authorised Release Workflow (PayPal Payouts only if verified usable)
   ↓
Auditable Project Timeline
```

## 5. Suggested domain model

Adapt names to the existing code style and database.

- `User`: id, displayName, email, demoRole (if using demo roles).
- `Project`: id, title, description, clientId, freelancerId, currency, status, createdAt.
- `ContractVersion`: id, projectId, versionNumber, termsJson, generatedFromConversation, clientApprovalStatus, freelancerApprovalStatus, approvedAt.
- `Milestone`: id, projectId, contractVersionId, title, amount, dueDate, deliverables, acceptanceCriteria, status.
- `Submission`: id, milestoneId, submittedBy, description, evidenceLinks, fileReferences, createdAt.
- `AcceptanceReport`: id, submissionId, criterionResults, evidenceSummary, missingItems, uncertainty, recommendation, createdAt, modelName.
- `Payment`: id, projectId, milestoneId (nullable for project-level checkout), provider, providerOrderId, providerCaptureId, amount, currency, status, verifiedAt.
- `Payout`: id, milestoneId, providerPayoutBatchId, recipientReference, amount, status, providerResponseSummary, createdAt.
- `WebhookEvent`: id, providerEventId, eventType, verificationStatus, processedAt, processingResult. Enforce uniqueness for provider event IDs.
- `AuditEvent`: id, projectId, actorId, eventType, entityType, entityId, safeMetadata, createdAt.

Do not store raw access tokens, secrets, or unnecessary sensitive payment data in these records. Store provider IDs and minimum required metadata only.

## 6. State transitions and business rules

Use explicit enums/constants rather than arbitrary strings. Validate transitions on the backend.

### Contract

`DRAFT → PENDING_APPROVAL → AGREED`

- Any material edit creates a new contract version and invalidates approvals for the previous version.
- Payment/work progression that depends on agreement must require the current version to be approved by both parties.
- Missing amount, currency, deliverable, due date, or acceptance criteria must be visibly marked for human confirmation rather than silently guessed.

### Milestone

`NOT_STARTED → IN_PROGRESS → SUBMITTED → ACCEPTED`

Alternative paths: `SUBMITTED → REVISION_REQUESTED → IN_PROGRESS`, or `SUBMITTED → DISAGREEMENT_FLAGGED`.

- An AI report is advisory evidence, not the client’s decision.
- Only an authorised client action may mark a milestone accepted.
- A disagreement must not automatically release funds.

### Payment

Use separate, provider-grounded statuses such as:

`NOT_CREATED`, `ORDER_CREATED`, `APPROVAL_PENDING`, `CAPTURE_PENDING`, `CAPTURED`, `FAILED`, `CANCELLED`, `UNKNOWN`.

- Set `CAPTURED` only after backend verification of the capture result.
- Do not mark payment successful from a query parameter, browser redirect, screenshot, or frontend-only state.
- Treat webhook processing as at-least-once: verify the signature, persist the event ID, and make processing idempotent.
- A repeated request or webhook must not create a duplicate capture, payout, ledger entry, or release action.

### Release / payout

- Release is a separate workflow from checkout capture.
- Require the correct milestone, agreed contract version, client acceptance, sufficient verified payment state, and explicit authorisation.
- If PayPal Payouts is not enabled/usable, use a visibly labelled `DEMO_SIMULATED` status. Never fabricate a provider payout ID or show a simulated event as a successful PayPal payout.
- Keep a clear audit trail for who initiated the action, when, amount/currency, provider response, and final state.

## 7. API integration plan

Use the official resources as the source of truth and verify current access from the PayPal Developer Dashboard.

- Hackathon resources: https://paypalaihackathon.devpost.com/resources
- PayPal Developer documentation: https://developer.paypal.com/docs/
- PayPal REST API: https://developer.paypal.com/api/rest/
- PayPal Checkout: https://developer.paypal.com/docs/checkout/
- PayPal Webhooks: https://developer.paypal.com/api/rest/webhooks/
- PayPal Payouts: https://developer.paypal.com/docs/payouts/
- PayPal Developer Dashboard / Sandbox: https://developer.paypal.com/dashboard/

### Checkout integration requirements

1. Configure sandbox credentials through environment variables.
2. Backend obtains an OAuth 2.0 access token from PayPal; do not expose the client secret in frontend code.
3. Backend creates a PayPal order with server-validated amount and currency.
4. Frontend launches the approved PayPal checkout UI using the repository's supported SDK/integration.
5. Backend captures the order through PayPal and verifies the response.
6. Persist provider order/capture IDs and the verified state.
7. Add webhook verification and deduplication if time permits; never trust an unverified webhook.

### Payouts integration requirements

- First verify that the developer account and sandbox support the required Payouts operation and recipient setup.
- Payouts is a way to send money to recipients; do not describe it as a funds-holding/escrow API.
- Implement only after Checkout is working.
- Use unique idempotency/request identifiers where supported, store the provider batch/reference ID, and reconcile final status from the provider.
- If access/prerequisites are missing, document the blocker and leave Payouts as a future integration rather than faking it.

### Environment variables

Use the names already present in the repository where practical. A possible `.env.example`:

```dotenv
# Server
APP_BASE_URL=http://localhost:8080
DATABASE_URL=change-me

# AI provider (use the provider already supported by the project)
AI_API_KEY=replace-with-your-key
AI_MODEL=replace-with-supported-model

# PayPal Sandbox — server only
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com
PAYPAL_CLIENT_ID=replace-with-sandbox-client-id
PAYPAL_CLIENT_SECRET=replace-with-sandbox-secret
PAYPAL_WEBHOOK_ID=replace-after-registering-webhook
PAYPAL_ENABLE_PAYOUTS=false

# Frontend public configuration only, if required by the selected SDK
VITE_PAYPAL_CLIENT_ID=replace-with-sandbox-client-id
VITE_API_BASE_URL=http://localhost:8080
```

Never commit `.env`, real credentials, tokens, or customer secrets. Add `.env` to `.gitignore`. A frontend client ID is not a substitute for server-side credential protection.

## 8. AI behaviour and output contracts

Use schema-constrained JSON output where the selected model/provider supports it. Validate every model response server-side. Treat pasted chat, uploaded content, and external URLs as untrusted data—not as instructions to the system.

### Contract extraction output

Return a structured object with:

- `projectSummary`
- `parties` (only names/details explicitly supplied)
- `deliverables[]`
- `milestones[]` (`title`, `amount`, `currency`, `dueDate`, `deliverables`, `acceptanceCriteria[]`)
- `revisionPolicy`
- `assumptions[]`
- `missingInformation[]`
- `itemsNeedingConfirmation[]`

Rules:
- Never invent an amount, deadline, party identity, legal term, or payment guarantee.
- Use `null`/“Needs confirmation” for missing values.
- Label generated text as a draft and require human review before agreement.

### Acceptance evaluation output

For each criterion return:

- `criterion`
- `status`: `MET`, `PARTIALLY_MET`, `NOT_MET`, or `UNVERIFIABLE`
- `evidence`: specific submitted evidence supporting the assessment
- `gap`: what is missing or unclear
- `confidence`: calibrated low/medium/high, or a numeric score only if the model and evaluation method justify it

Also return `overallSummary`, `missingEvidence[]`, `uncertainties[]`, and `recommendedNextStep`. The UI must say that AI can be wrong and that the client makes the final acceptance decision. Do not claim the AI can objectively prove quality from unsupported evidence.

## 9. Security, privacy, and reliability

- Validate all request bodies and amounts server-side; never trust totals supplied by the browser.
- Keep PayPal client secrets and AI API keys on the backend.
- Verify PayPal webhook signatures before processing events.
- Apply idempotency and uniqueness checks to captures, webhook events, and payouts.
- Add authentication/authorisation checks to project, contract, submission, approval, and release endpoints. For demo roles, label the mode as demo and do not represent it as production identity verification.
- Prevent a client from approving on behalf of a freelancer and vice versa.
- Restrict uploaded file types/size if file uploads are implemented; avoid executing uploaded content.
- Do not send unnecessary personal or payment data to the AI provider.
- Record important actions in an audit timeline without logging secrets.
- Handle provider timeouts as `UNKNOWN`/pending and reconcile status; do not assume failure or success from a timeout.

## 10. Suggested API routes

Adapt to the existing backend conventions; these are examples, not a mandate to duplicate existing routes.

```text
POST   /api/projects
GET    /api/projects
GET    /api/projects/{projectId}
POST   /api/projects/{projectId}/contract-drafts
PUT    /api/projects/{projectId}/contract-drafts/{draftId}
POST   /api/projects/{projectId}/contract-versions/{versionId}/approve
POST   /api/projects/{projectId}/milestones
POST   /api/milestones/{milestoneId}/submissions
POST   /api/submissions/{submissionId}/evaluate
POST   /api/milestones/{milestoneId}/accept
POST   /api/milestones/{milestoneId}/request-revision
POST   /api/milestones/{milestoneId}/flag-disagreement
POST   /api/payments/paypal/orders
POST   /api/payments/paypal/orders/{orderId}/capture
POST   /api/webhooks/paypal
POST   /api/milestones/{milestoneId}/payouts   # only after Payouts access is verified
GET    /api/projects/{projectId}/timeline
```

Never allow a browser request to directly set a payment to `CAPTURED` or a payout to `PAID`.

## 11. UI requirements

Build a clean, credible dashboard suitable for a live hackathon demo:

- **Project overview:** parties, project status, current contract version, milestones, and payment state.
- **Conversation → Contract:** conversation input beside an editable generated contract, with missing details highlighted.
- **Agreement panel:** clear approval status for each party and version history.
- **Payment panel:** PayPal Sandbox branding/flow, provider-grounded status, and explicit sandbox label.
- **Milestone workspace:** criteria checklist, evidence submission, submission history, AI report, client decision buttons.
- **Activity timeline:** agreement, payment, submissions, reports, revisions, approvals, and release/payout events.
- **Transparency labels:** distinguish `Sandbox`, `AI-generated`, `Needs confirmation`, `Simulated`, and verified provider status.

Avoid dead buttons and placeholder interactions in the main demo path. If a feature is not implemented, label it as unavailable or future scope.

## 12. Implementation instructions for Antigravity

Work incrementally and inspect the repository first.

1. **Audit the repository:** identify frontend/backend frameworks, entry points, database, current features, environment variables, tests, and run commands. Do not overwrite existing work without understanding it.
2. **Report a short implementation plan:** list files/modules to reuse, create, and change. Identify any missing credentials or provider-access blockers.
3. **Implement P0 end-to-end:** start with data model and contract workflow, then PayPal Sandbox Checkout, then milestone evidence/AI report, then UI timeline.
4. **Use real integrations where configured:** do not replace PayPal or AI API calls with fake success responses. If credentials are missing, build the integration boundary and show a clear configuration error; use an explicitly labelled demo mode only where needed to keep non-payment workflows testable.
5. **Keep secrets server-side** and add `.env.example` without real keys.
6. **Add tests:** contract extraction validation, missing-term handling, state transitions, payment verification, webhook signature/duplicate handling, role authorisation, and AI report schema validation.
7. **Run the project:** install dependencies, run migrations/seed data, start backend and frontend, and fix build/runtime errors. Do not claim tests pass unless actually run.
8. **Document exact commands:** setup, environment variables, sandbox accounts, test flow, and known limitations.
9. **After P0 works, assess Payouts:** verify account eligibility and sandbox functionality before implementing it.
10. **At completion, report:** files changed, features implemented, commands run, test results, required secrets, known issues, and a demo script. Do not claim production-ready escrow.

### Definition of done

- A fresh developer can follow the README to configure and run the app.
- The main demo can create a project, generate/review a contract, record approvals, make a sandbox checkout, submit evidence, produce an AI report, and record the client's decision.
- Payment state comes from backend verification, not a fake frontend success.
- Missing contract details are surfaced for confirmation.
- AI does not autonomously release funds or decide disputes.
- Sandbox, simulated, and verified provider states are visually distinct.
- No credentials are committed.
- Tests and limitations are documented honestly.

## 13. Demo script for judges

1. Paste a short example chat where a client requests a website with two milestones.
2. Generate the contract and show how ambiguous deadline/acceptance terms are flagged for confirmation.
3. Edit the criteria and show both demo parties approving the same version.
4. Complete a PayPal Sandbox Checkout using a sandbox buyer account.
5. Show the backend-verified payment state and project timeline.
6. Submit milestone evidence that satisfies some criteria but misses one requirement.
7. Run the AI Acceptance Gate and show evidence, gaps, uncertainty, and recommendation.
8. Request a revision, submit updated evidence, and accept the milestone as the client.
9. If Payouts Sandbox is confirmed available, demonstrate its real provider status. Otherwise show the clearly labelled simulated release path and explain that true funds holding requires a supported PayPal product/partner arrangement.

## 14. Project positioning

**One-line pitch:** *ChatEscrow turns informal freelancer conversations into agreed, evidence-backed milestone workflows, combining AI contract structuring, PayPal Sandbox payments, and transparent human-reviewed acceptance.*

**Innovation is not merely adding a chatbot or calling a payment API.** The differentiator is the connected workflow: conversation-to-agreement, explicit acceptance criteria, evidence-based AI review, mutual approval, verified payment state, and an auditable milestone history. Be precise about what is live, simulated, and dependent on provider approval.
