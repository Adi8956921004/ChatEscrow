# ChatEscrow Project Review: Fixes and Improvements

Reviewed 30 Oct 2026 from the repo files in the PayPal hackathon Project. This was a search-excerpt review: not every file was read, and the build and tests were not run. The Project holds several versions of `AiService.java`, `WebhookController.java` and `.gitignore`, so some findings may refer to older copies.

## 1. Fix first: leaked credentials

- **`.env` is uploaded into the Project's knowledge.** It holds what look like a real Gemini key, a PayPal sandbox client ID and secret, and a webhook ID. Rotate all of them (Google AI Studio and the PayPal dashboard), then delete `.env` from the Project. Keep only `.env.example`.
- **Check the GitHub history** with `git log --all -- .env`. If `.env` was ever committed, rotating is the only real fix. The top-level `.gitignore` covers it, but it does not help if the file was committed earlier.
- **Older `AiService` versions put the API key in the URL** (`?key=`), which leaks into logs. The newer version correctly uses the `x-goog-api-key` header. Make sure only that version is in the repo.

* **Credentials as defaults in source.** One version of `application.properties` sets the PayPal client ID, client secret and webhook ID as fallback values inside `${...}`. These ship in the repo and its history. Use empty defaults, as the newer version does, and rotate those values too.

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

## 5. Feature behavior and logic

Several features can act on the wrong record, show invented data, or skip a state check.

1. **`getMilestone` guesses.** In one version of `MilestoneService`, an unknown ID falls back to a title match ("design", "frontend") and then to the first milestone in the database. A typo or stale ID can accept or release the wrong milestone. Throw `ResourceNotFoundException` instead, as the newer version does.
2. **Fake data shown as real.** The frontend fills the Timeline with invented events ("DEMO\_ESCROW\_DEPOSITED") and the Milestone screen with a made-up submission when the API returns nothing. A judge cannot tell real from invented. Show an empty state, or label seeded data "Demo data".
3. **Refund does not refund.** `refundMilestoneEscrow` sets the milestone to `NOT_STARTED` and writes an audit line, but calls no PayPal refund and does not touch the `Payment` row. Either implement a sandbox refund and record it, or rename the action and mark it simulated.
4. **State checks are uneven.** `acceptMilestone` requires `SUBMITTED`, but `requestRevision` and `flagDisagreement` accept any status. A client can flag a milestone that was never submitted or is already accepted. Add the same guard, and decide what a second submission does while a dispute is open.
5. **Release race.** `releaseMilestone` checks for an existing payout, then creates one. Two simultaneous clicks can both pass the check. Add a unique constraint on `Payout.milestoneId` and handle the duplicate-key error by returning the existing payout.
6. **Payment vs milestone amount.** Release should compare the sum of `CAPTURED` payments with the milestone amount, not just check that one exists. A partial or wrong-currency payment currently counts as funded.
7. **Hardcoded actor.** The frontend sends `submittedBy: "Alex Carter"` and a fixed `X-Actor-Id`. Take the actor from the token on the server, and drop it from the request body.
8. **Dispute mediation.** The split recommendation is advisory, which is right. Validate that the two amounts add up to the milestone amount before showing them, because the model can return numbers that do not.
9. **Unfinished edge cases.** Test and decide: a contract edited after payment, a milestone amount changed after funding, two submissions in a row, a webhook arriving before the capture call returns, and a PayPal order approved but never captured (expiry).

## 6. Web, frontend and API

The web layer mostly needs error handling, input checks and fewer ways to trigger payment actions by accident.

- **Payment redirect handling.** The app reads `?token=` from the URL and auto-captures. It only checks `sessionStorage` or a loaded payments list, and `payments` is empty on first render. Also clear the token after use, and confirm on the server that the order belongs to this project before capture.
- **Silent failures.** Many calls end in `.catch(() => {})` (milestones, payments, submissions). The user sees an empty screen with no error. Show an error state with a retry button, as `Timeline` already does.
- **Duplicate clicks.** Add a disabled-while-loading state to Accept, Release, Capture and Evaluate, and send an idempotency key (`PayPal-Request-Id`, already in the CORS allow-list) on order creation.
- **Input validation.** Use `@Valid` and bean validation on request bodies (they are plain `Map<String, String>` today). Check lengths, URL format for evidence links, positive amounts, and allowed currencies. Cap the conversation text sent to the AI.
- **Hand-built JSON.** Audit metadata is built by string concatenation, and quotes are replaced with `'`. Use `ObjectNode`, as the newer version does everywhere.
- **Error responses.** Add a `@ControllerAdvice` that maps your exceptions to 400, 403, 404 and 409 with a small JSON body. Today a failure may surface as a 500 with a stack-style message.
- **Evidence uploads.** The UI has an upload icon but only stores links and file names. Either build real uploads (size and type limits, stored outside the web root) or relabel the field "Evidence links" so the demo does not imply it.
- **Security headers and CORS.** Add a Content-Security-Policy, and keep CORS origins in config per environment. Keep the H2 console off unless `H2_CONSOLE_ENABLED=true`, as the newer version does.
- **Frontend structure.** One very large `App.tsx` with many `useState` calls per screen. Move API calls into hooks (for example `useMilestones`), share the `Button`, `Card` and `Badge` components in separate files, and add basic accessibility: labels on icon buttons, focus states, and colour contrast on the status badges.
- **Mobile and polling.** Check the layout at phone width. After a PayPal approval, poll the payment status for a few seconds instead of asking the user to press Refresh.

## 7. Scalability and operations

The prototype is fine for one demo project. These are the limits you will hit first, in the order you will hit them.

| Area | Current behavior | Change | When it matters |
| --- | --- | --- | --- |
| Database | H2 in memory, `create-drop`, data lost on restart | PostgreSQL, Flyway migrations, `ddl-auto=validate` | Any deployed demo |
| Queries | `findAll().stream().filter(...)` in lookups; list endpoints return everything | Query by indexed column; add `Pageable` to projects, timeline and webhook lists | Hundreds of rows |
| Indexes | None seen on `milestoneId`, `projectId`, `providerOrderId` | Add indexes; unique on `providerEventId` and `Payout.milestoneId` | Hundreds of rows |
| External calls | `WebClient` with `.block()` and no timeouts or retries | Set connect and response timeouts; retry with backoff on 429 and 5xx | First slow PayPal or Gemini response |
| PayPal token | Fetched per call in the excerpts seen | Cache the token until shortly before expiry | Rate limits |
| AI cost | Every evaluate call hits Gemini; no limit | Per-user rate limit, cache results by submission hash, cap input size | Public demo |
| Webhooks | Processed inside the request | Return 200 first, process asynchronously, retry failures | PayPal retries |
| State | Shared fields such as `lastCallLive` | Per-request results, no mutable singleton state | Concurrent users |
| Config | Fallback model names scattered through code | One typed `@ConfigurationProperties` class | Any environment change |

Operations to add before a live demo or public link:

- **Health and logging.** Add Spring Actuator `/health`, structured logs with a request ID, and log PayPal `debug_id` values on errors. Never log tokens, keys or full webhook bodies.
- **Deployment.** A `Dockerfile` for the backend, a static build of the frontend, and one `docker-compose.yml` with PostgreSQL. Document the environment variables the host needs.
- **CI.** A workflow that runs `mvn test` and `npm run build` on every push, plus a secret scan (gitleaks or GitHub secret scanning) so a key cannot be committed again.
- **Backups of the demo.** Keep a seeded SQL script and a screen recording, so a failed sandbox or API outage does not end the presentation.
- **Growth path, if it became a product.** Real authentication (OAuth or sessions) instead of demo tokens, per-project membership, an audit table that cannot be edited, a regulated escrow or marketplace partner for holding funds, and background jobs for reconciliation of `UNKNOWN` payments.
