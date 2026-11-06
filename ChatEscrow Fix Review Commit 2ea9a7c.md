# ChatEscrow Fix Review: Commit 2ea9a7c

Nov 6, 2026 · @mr.NoOne

Most of the earlier review's fixes are in and correct, but five problems remain, led by credentials in git history and a refund that can mark a real payment `REFUNDED` when PayPal refused it. I checked commit `2ea9a7c` against the [project review doc](https://claude.ai/artifact/GsZuhyCKWUYQ2Vc6jJz1fh). The frontend typechecks and builds. I could not run the backend tests because Maven Central is not reachable from this session, so the test and CI changes are unverified until `mvn test` runs on your machine or in GitHub Actions.

## Fixed correctly

- **Fake capture fallback:** `SANDBOX-NET-…` and the hardcoded `400.00` are gone. A timeout now becomes `UNKNOWN` (HTTP 504), a PayPal 4xx/5xx becomes `FAILED`, and there is a `recheck` endpoint.
- **Capture and webhook amount checks:** both compare amount and currency against the milestone before marking `CAPTURED`.
- **Open endpoints:** evaluate, GET submissions and reports, dispute pack, draft generate/save, and demo-deposit now require a participant. `requireParticipant` and `verifyProjectAccess` are in place.
- **Tokens:** comparison is constant-time, the actor comes from the token rather than `X-Actor-Id`, and the tokens are configurable.
- **Webhook:** it verifies the signature first, rejects a failed signature, then deduplicates on the event ID, with a unique constraint as a backstop.
- **Milestone logic:**
  - `getMilestone` no longer guesses.
  - Revision, dispute and accept are guarded by status.
  - Release is idempotent through a unique `Payout.milestoneId`.
  - Release checks that captured payments cover the milestone amount in the right currency.
- **Escrow wording:** the UI now says "Sandbox, Not Regulated Escrow".
- **Other items:** the manual capture box is removed, there are timeouts on `WebClient`, the PayPal token is cached, there are AI input caps and an error handler, and Actuator, Docker and CI are added. The latest commit also stops `sync-milestones` from inventing a submitted milestone and a fake submission.
