# ChatEscrow PayPal Hackathon: Code Review

Oct 19, 2026 · @mr.NoOne

## Scope and main takeaway

The demo's core promise is honest labelling of what is real, simulated, or verified, and several places in the code break that promise. This review covers the README, the project brief, `.env`, `.gitignore`, and the code excerpts returned by project search (PayPalService, WebhookController, MilestoneController, MilestoneService, App.tsx, and the main test). I did not see the full source files, so line-level details may be missing.

## Critical: fix before submitting

1. **Secrets are exposed.** The `.env` stored in this project holds the Gemini API key, the PayPal sandbox client ID and secret, and the webhook ID in plain text. `.gitignore` excludes `.env` correctly, but the copy in project knowledge is readable by anyone with access. Rotate the Gemini key and the PayPal sandbox secret, delete `.env` from the project, and add a real `.env.example` (the README mentions one; I did not find it).
2. **`PayPalService` fakes a successful capture.** On a 422 from PayPal, or a network failure after a 422, it returns a `SANDBOX-NET-xxxx` capture ID with status `COMPLETED` and a hardcoded `400.00` amount. This violates the brief's rule never to mark `CAPTURED` without backend verification, and it ignores the real order amount. Return `UNKNOWN` or `FAILED` with a visible error instead.
3. **The frontend swallows backend errors and shows success.**
   - `handleDecision` calls `acceptMilestone(...).catch(() => {})`, then sets the status to `ACCEPTED` locally, so a backend rejection still unlocks the payout step.
   - `handleRelease` catches any failure and shows "SUCCESS (Simulated Release)" with a fake `DEMO-PAYOUT-…` batch ID.
   - The AI evaluation fallback hardcodes every criterion as `MET` with high confidence.
   - If the backend or Gemini fails mid-demo, judges see fabricated results. Show an explicit error or a clearly labelled demo-data banner instead.

## High: contradicts the project's own rules

1. **"Escrow" wording is still everywhere.** The brief says never claim escrow, yet the UI says "Escrow release of … authorized" and "neutral escrow dispute resolution", an endpoint is named `refundMilestoneEscrow`, and the product name is ChatEscrow. Rename UI strings and endpoints to "milestone release", and consider a subtitle such as "milestone payment protection".
2. **Dispute endpoints go beyond scope.** `MilestoneController` exposes `/refund`, `/resolve-dispute` (with a "split" resolution), and `/ai-mediation`. The brief puts these in P2 and says AI must not decide disputes. They are also unauthenticated.
3. **There is no authentication or authorization.** The server trusts `actorId` from the request body and defaults it to `"client"`, so anyone can call `/accept` and `/release` directly. The promise that a client cannot approve for the freelancer is not enforced. At minimum, pass a demo role token and check it on accept, release, and contract approval.
4. **Release does not check payment state.** `releaseMilestone` only requires `ACCEPTED`. The brief also requires a captured payment, an agreed contract version, and explicit authorization, so a milestone can be "released" with no money captured.

## Medium

| Issue | What is wrong | Fix |
| --- | --- | --- |
| Payout idempotency | `senderBatchId` includes `System.currentTimeMillis()` and is reused as `PayPal-Request-Id`, so a double-click or retry creates a second payout. | Use a stable ID per milestone and keep a `Payout` row with a unique constraint. |
| Webhook handling | Deduplication runs before verification, so a forged event with a real ID can block the genuine one. It keys on the transmission ID, which changes on retries. I did not see how unverified events are handled. | Verify first, dedupe on the event ID, and confirm unverified events cannot change payment state. |
| README vs code | The README says `gemini-2.0-flash`, while `.env` and the UI use `gemini-3.8-flash`. The README's webhook and port claims (`8443` or `5173`) also need checking. | Align the README with the code. |
| Test coverage | The main test calls services directly and only asserts the payout batch ID is not null. There are no tests for role authorization, duplicate or forged webhooks, capture failure, payout idempotency, or AI schema validation. | Add tests for each item the brief lists. |
| Audit JSON | Notes are concatenated into JSON strings, so backslashes or newlines produce invalid JSON. | Build the JSON with `ObjectMapper`. |
| Stray files | `scratch_payload.json` is a leftover Gemini test payload. | Delete it. |

## Suggested fix order

1. Rotate the keys and remove `.env` from the project.
2. Remove the fake capture and the frontend success fallbacks.
3. Rename the "escrow" wording in the UI and endpoints.
4. Add basic role checks, and require a captured payment before release.
5. Make payouts idempotent.
6. Delete or hide the refund, resolve-dispute, and AI-mediation endpoints.
7. Add the missing tests.
