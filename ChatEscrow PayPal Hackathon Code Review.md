
## Critical

1. **Hardcoded PayPal credentials in `application.properties`.** The `${PAYPAL_CLIENT_ID:AYPBN9...}`, `${PAYPAL_CLIENT_SECRET:ENvu...}` and webhook ID defaults are real values, and they live in source, not just `.env`. Rotate them, remove the defaults (use `${PAYPAL_CLIENT_ID:}`), and scrub git history if the repo is public.
2. **`PayPalService.captureOrder` still fakes captures.** On a 422, or when the order status is `CREATED`, `APPROVED` or `COMPLETED`, it returns a `SANDBOX-SIM-…` ID with status `COMPLETED`.
   - `CREATED` means the buyer never approved the order, so this marks payments captured that were never paid.
   - The amount falls back to a hardcoded `400.00`.
   - Return `FAILED` or `UNKNOWN` with the real reason instead. If you need a demo path, use the existing `DEMO_ESCROW` provider, which is labelled.
3. **Capture errors look like successes in the UI.**
   - `ProjectController.captureOrder` catches exceptions and returns HTTP 200 with `status: "ERROR"`.
   - `handleCaptureOrder` in `App.tsx` only checks for a thrown error, so it shows "Captured & Verified" for a failed capture.
   - Return 4xx/5xx from the backend, and have the frontend check `status === "CAPTURED"`.
4. **`PaymentService.captureOrder` accepts any order ID.** An unknown ID creates a payment for `demo-project-001` / `demo-milestone-frontend` / $400, then tries to capture it. Reject unknown orders, and compare the captured amount against the expected milestone amount.
5. **Amounts are trusted from the browser.** `createOrder` takes `amount` from the request body, although the code comment says the browser never sends it. Look up the milestone and use its stored amount.
6. **Fuzzy ID fallbacks target the wrong record.** `MilestoneService.getMilestone` returns the first milestone, or one matching "design" or "frontend" in the ID, when the ID isn't found. `ProjectService.getProject` and `resolveProjectId` do the same. A typo'd ID can therefore accept or release the wrong milestone. Throw a 404 instead.

## High

7. **Role checks are spoofable and incomplete.**
   - `role` and `actorId` come from the request body, so anyone can send `"role":"client"`.
   - `request-revision`, `flag-disagreement`, contract `approve`, `demo-deposit` and `/payments/{id}/refund` have no role check at all.
   - The brief requires that one party can't approve for the other.
   - Add Spring Security with a demo token or header per demo user, and derive the role server-side.
8. **`demo-deposit` creates `CAPTURED` payments for anyone.** Since release only checks for a captured payment, one unauthenticated POST makes any milestone releasable. Restrict it to the client role, and have release show the provider, so a `DEMO_ESCROW` payment can only produce `DEMO_SIMULATED` release status.
9. **Release isn't idempotent.**
   - The batch ID includes `System.currentTimeMillis()` and is reused as `PayPal-Request-Id`, and nothing prevents releasing twice.
   - Add a `Payout` entity with a unique constraint on `milestoneId`, a stable idempotency key, and an "already released" check.
10. **Dead frontend calls and orphaned service code.** `data.ts` still calls `/refund`, `/resolve-dispute` and `/ai-mediation`, which the controller removed, so they now 404. `MilestoneService` still has `refundMilestoneEscrow`, `resolveDispute` and `aiMediateDispute`, and the tests exercise them. Delete all of it (P2 scope, and AI shouldn't mediate disputes), or restore the endpoints properly.
11. **Webhooks never update payment state.** Verified events are stored and nothing more. Handle `PAYMENT.CAPTURE.COMPLETED` and `PAYMENT.CAPTURE.DENIED` idempotently by looking up the payment by capture or order ID. Also:
    - `/webhooks/simulate` saves events as `VERIFIED`. Label them `SIMULATED`.
    - The dedupe check can race, so catch the unique-constraint violation.

## Honesty of the UI

The brief says to label sandbox, simulated and verified states clearly, and these places don't:

- **Escrow wording.** "Escrow Funding & Checkout", "Fake Money Deposit", "Verifiable Escrow Ledger" and "Escrow Amount" all appear. Use "milestone funding" and "payment ledger".
- **Escrow certificate.** `EscrowCertificateModal` is a "Verifiable Escrow Deposit Certificate" with a hardcoded `sha256:e3b0c442…` digest, which is the SHA-256 of an empty string. Remove it, or generate a real hash and drop the "cryptographic proof" claim.
- **Fabricated frontend fallbacks.**
  - When the backend is down, the demo deposit creates a local `CAPTURED` payment and the refund modal marks payments `CANCELLED`. Show an error instead.
  - The Review screen shows a hardcoded "94% match" and fake submissions before any AI run.
  - Dashboard values (`$400`, "Frontend Milestone", "94% match") are static.
- **AI demo output saved as real.** When no key is set, `evaluateSubmission` returns a canned report unrelated to the actual criteria, and it is stored with `aiGenerated=true`. Set it false and surface "demo data" in the UI.
- **Hardcoded model name.** The service hardcodes `"gemini-3.8-flash (live)"` while the README says `gemini-2.0-flash`. Read the model from config in both places.

## Contract and agreement flow

12. **Edits don't invalidate approvals.** The builder lets users edit milestones, but `saveDraft` is never called, so no new version is created and approvals stay on the old one. Save a new version on edit and reset approvals.
13. **Signing isn't blocked on missing terms.** Milestones with `$0` or "Needs confirmation" can still be signed. Disable signing until the flagged items are resolved.
14. **Failed approvals are swallowed.** `approveContract(...).catch(() => {})` and `createMilestone(...).catch(() => {})` mean the UI says "Fully Approved & Activated" even if the backend rejected it. The agreement flow also appends 4 more milestones on top of the 4 seeded ones.
15. **Deliverables parsing is fragile.** `value.split(", ")` on every keystroke corrupts input. Use a proper list editor or a textarea with one item per line.

## AI service

16. **Responses aren't schema-validated.** `callGeminiWithModel` only checks that the output parses as JSON. Validate it server-side, including enum values (`MET`, `PARTIALLY_MET` and so on), a missing `criterionResults`, and a non-numeric amount.
17. **The API key goes in the URL.** `?key=` is added alongside the `x-goog-api-key` header, so the key can end up in logs. Use the header only.
18. **Prompt injection.** The prompts rely on "treat as untrusted", but the content is concatenated into the same string. Use Gemini's `systemInstruction` field for the rules and put the user content in `contents`.

## Smaller things

- **Audit JSON.** Several places still build JSON with string concatenation (`createProject`, `createMilestone`, `requestRevision`, `flagDisagreement`, `refundPayment`). Use `ObjectMapper`, as `releaseMilestone` already does.
- **No `PayPal-Request-Id` on order creation and capture.** The access token isn't cached either. The `return_url` and `cancel_url` are hardcoded to `localhost:5173`, so use `APP_BASE_URL`.
- **Auto-capture from the URL.** `PaymentScreen` captures whatever `?token=` is in the URL on load, so only do it for orders the backend created.
- **Frontend structure.** `App.tsx` is about 1,800 lines. Split it into `screens/`, `components/` and `api/`. `Icon` re-allocates every path on each render.
- **Two lockfiles** (`package-lock.json` and `pnpm-lock.yaml`) in `frontend/`, and the README says npm while Figma Make uses pnpm. Keep one. `VITE_PAYPAL_CLIENT_ID` is also unused.
- **`.env.example` starts with a BOM character.** `pom.xml` has one too. Re-save both as UTF-8 without BOM.
- **Hardening.** Turn off the H2 console outside dev, and tighten CORS (`allowCredentials(true)` isn't needed).
- **Stray files.** Delete `scratch_payload.json` and the empty `frontend/.gitattributes` LFS rules, which are overkill for this repo.

## Tests to add

The current tests call services directly, so none of the above would be caught. Add `MockMvc` tests for:

- role spoofing on accept and release
- a failed capture and a 422 from PayPal (mock `PayPalService`)
- a forged or duplicate webhook
- double release returning the same payout
- release with only a `DEMO_ESCROW` payment
- AI schema validation, including a malformed response

Also update the README: model name, ports, and a note that credentials must come from the environment.

