# ChatEscrow Project Review: Fixes and Improvements

Reviewed 30 Oct 2026 from the repo files in the PayPal hackathon Project. This was a search-excerpt review: not every file was read, and the build and tests were not run. The Project holds several versions of `AiService.java`, `WebhookController.java` and `.gitignore`, so some findings may refer to older copies.

## 1. Fix first: leaked credentials

- **`.env` is uploaded into the Project's knowledge.** It holds what look like a real Gemini key, a PayPal sandbox client ID and secret, and a webhook ID. Rotate all of them (Google AI Studio and the PayPal dashboard), then delete `.env` from the Project. Keep only `.env.example`.
- **Check the GitHub history** with `git log --all -- .env`. If `.env` was ever committed, rotating is the only real fix. The top-level `.gitignore` covers it, but it does not help if the file was committed earlier.
- **Older `AiService` versions put the API key in the URL** (`?key=`), which leaks into logs. The newer version correctly uses the `x-goog-api-key` header. Make sure only that version is in the repo.

## 2. Fix before the demo

1. **Fake payment success.** `PayPalService.captureOrder` returns a `SANDBOX-NET-…` capture ID with status `COMPLETED` and a hardcoded `400.00` amount on a 422 or network failure. This breaks the project's own rule: never fabricate a provider result and never mark `CAPTURED` without verification. Return `UNKNOWN` or `FAILED` instead, and reconcile with `recheckOrder`.
2. **Unprotected endpoints.** In `MilestoneController`, `evaluateSubmission`, the GET endpoints and `getDisputePack` have no role check. In `ProjectController`, `saveDraft` and `generateDraft` have none either. Anyone can burn AI quota or edit a contract. Add role checks, and check that the caller is a party on that project.
3. **Draft edits and approvals.** Confirm that `saveDraft` creates a new version and clears approvals, and that `approveVersion` only works on the current version while the contract is in `PENDING_APPROVAL`.
4. **Webhook order of operations.** One version of `WebhookController` deduplicates before verifying the signature, which lets a forged ID block the real event. The newer version verifies first, so keep that one. Also persist the event ID only after the work is done, reject events whose status is `SKIPPED` or `FAILED` instead of storing and ignoring them, and return 200 quickly.
5. **Escrow wording in the UI.** `App.tsx` says "Verifiable Escrow Ledger" and "buyer and seller protection", which contradicts the README's financial-boundary note. Rename it to "Milestone Payment Ledger" and add a visible "Sandbox, not regulated escrow" label. Judges will check this.
6. **"Manual Order Capture" box.** Letting any order ID be captured is a debug feature. Remove it, or capture only orders the backend created for that project and check the captured amount against the milestone amount.
7. **AI model and prompt handling.**
   - `AI_MODEL=gemini-3.8-flash` in `.env` is not a model name I can confirm exists. If it does not, the app silently falls back to demo mode, so check which model the live call actually uses.
   - Fallback model names are inconsistent (`gemini-1.5-flash` vs `gemini-flash-latest`). Make it one config value.
   - Use `systemInstruction` for every prompt, including `mediateDispute`.
   - Parse and validate JSON for contract extraction, as is already done for evaluation.
   - Show a visible "demo mode" badge whenever `lastCallLive` is false.
8. **Race condition.** `lastCallLive` is a shared `volatile` field, so concurrent requests can mislabel each other. Return a `live` flag with each result instead.
9. **Release and dispute logic.** Release must require a `CAPTURED` payment, an `ACCEPTED` milestone, a matching amount and idempotency (a double click must not pay twice). The mediator's split recommendation must stay advisory and never execute automatically.

## 3. Smaller improvements

- **Repo hygiene:** delete `scratch_payload.json`, remove the duplicate GitHub sync source, and keep one `.gitignore`. Move `ChatEscrow-README-for-Antigravity.md` into `docs/`.
- **README:** the port story is inconsistent (5173 vs 8443). Say that `VITE_PAYPAL_CLIENT_ID` is required. Add a "Known limitations" section and a 2-minute demo script.
- **CORS and database:** keep allowed origins in config. H2 in-memory data resets on every restart, so keep the seed data reliable.
- **Tests:** the happy-path and role-spoofing tests are good. Add tests for capture failure leading to `UNKNOWN`, a duplicate webhook, a forged webhook, a double release, a contract edit invalidating approvals, and malformed AI JSON.
- **Frontend:** `App.tsx` appears to be one very large file. Split it into pages (Dashboard, Contract, Milestone, Timeline) so bugs are easier to find. Add loading and error states on every API call.
- **Demo polish:** a one-click "reset demo" endpoint, a visible Sandbox / Demo / AI-generated badge on each panel, and a short screen recording as a backup in case the PayPal sandbox is down during judging.

## 4. Suggested order of work

1. Rotate and remove credentials (section 1).
2. Remove the fake capture fallback (2.1).
3. Add role checks to the open endpoints (2.2).
4. Fix the escrow wording (2.5).
5. Remove or restrict manual capture (2.6).
6. Then the remaining items in sections 2 and 3.
