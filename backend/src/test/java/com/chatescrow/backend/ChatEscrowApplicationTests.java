package com.chatescrow.backend;

import com.chatescrow.backend.ai.AiService;
import com.chatescrow.backend.exception.PayPalApiException;
import com.chatescrow.backend.exception.PayPalCaptureTimeoutException;
import com.chatescrow.backend.model.*;
import com.chatescrow.backend.paypal.PayPalService;
import com.chatescrow.backend.repository.*;
import com.chatescrow.backend.service.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class ChatEscrowApplicationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ProjectService projectService;

    @Autowired
    private ContractService contractService;

    @Autowired
    private MilestoneService milestoneService;

    @Autowired
    private PaymentService paymentService;

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private ContractVersionRepository contractVersionRepository;

    @Autowired
    private MilestoneRepository milestoneRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private PayoutRepository payoutRepository;

    @Autowired
    private AuditEventRepository auditEventRepository;

    @Autowired
    private AiService aiService;

    @MockBean
    private PayPalService paypalService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    @DisplayName("Verify context loads and demo data is seeded")
    void contextLoadsAndSeededDataExists() {
        List<Project> projects = projectService.getAllProjects();
        assertFalse(projects.isEmpty(), "Demo project should be seeded on startup");
        Project demoProject = projects.get(0);
        assertNotNull(demoProject);
        assertEquals("Sarah Miller", demoProject.getClientName());
        assertEquals("Alex Carter", demoProject.getFreelancerName());
    }

    @Test
    @DisplayName("End-to-end workflow: Create Project -> Draft Contract -> Mutual Approval -> Milestones -> Submit -> AI Eval -> Client Decision -> Release")
    void endToEndJourneyWorkflow() {
        // 1. Create project
        Project project = projectService.createProject(
                "Mobile App Redesign",
                "Redesign React Native mobile application",
                "Alice Client",
                "alice@example.com",
                "Bob Dev",
                "bob@example.com",
                new BigDecimal("2500"),
                "USD"
        );
        assertNotNull(project.getId());

        // 2. Draft contract from conversation
        String conversation = """
                Alice: Hi Bob, we need a complete mobile app redesign. Budget is $2500.
                Bob: Sounds good! Milestone 1: Wireframes ($1000, due in 2 weeks).
                Bob: Milestone 2: UI Implementation ($1500, due in 4 weeks).
                Alice: Great! We require Figma components and 2 revision rounds.
                """;
        ContractVersion draft = contractService.generateDraftFromConversation(project.getId(), conversation);
        assertNotNull(draft);
        assertEquals(1, draft.getVersionNumber());
        assertFalse(draft.isAgreed());

        // 3. Mutual approval
        ContractVersion afterClient = contractService.approveVersion(draft.getId(), "client");
        assertFalse(afterClient.isAgreed());
        ContractVersion fullyApproved = contractService.approveVersion(draft.getId(), "freelancer");
        assertTrue(fullyApproved.isAgreed());

        // 4. Milestone creation
        Milestone m1 = projectService.createMilestone(
                project.getId(),
                "Wireframes & Architecture",
                new BigDecimal("1000"),
                "2025-10-30",
                "Figma Wireframes|System Architecture doc",
                "All user journeys covered|Figma components documented",
                "Deliver wireframes for client review",
                fullyApproved.getId()
        );
        assertEquals(Milestone.MilestoneStatus.NOT_STARTED, m1.getStatus());

        // 5. Freelancer submits evidence
        Submission sub = milestoneService.submitEvidence(
                m1.getId(),
                "Bob Dev",
                "Completed all Figma wireframes and architecture diagrams",
                "https://figma.com/file/demo123|https://github.com/demo/repo",
                "wireframes-v1.pdf"
        );
        assertNotNull(sub.getId());
        assertEquals(Milestone.MilestoneStatus.SUBMITTED, milestoneRepository.findById(m1.getId()).orElseThrow().getStatus());

        // 6. AI acceptance evaluation
        AcceptanceReport report = milestoneService.evaluateSubmission(sub.getId());
        assertNotNull(report);
        assertNotNull(report.getCriterionResultsJson());

        // 7. Client revision request and resubmission
        Milestone revised = milestoneService.requestRevision(m1.getId(), "Alice Client", "Please add dark mode");
        assertEquals(Milestone.MilestoneStatus.REVISION_REQUESTED, revised.getStatus());

        milestoneService.submitEvidence(m1.getId(), "Bob Dev", "Added dark mode wireframes", "https://figma.com/dark", "v2.pdf");

        // Client accepts milestone
        Milestone accepted = milestoneService.acceptMilestone(m1.getId(), "Alice Client");
        assertEquals(Milestone.MilestoneStatus.ACCEPTED, accepted.getStatus());

        // 8. Fund milestone (required before release)
        Payment capturedPayment = Payment.builder()
                .projectId(project.getId())
                .milestoneId(m1.getId())
                .amount(new BigDecimal("1000"))
                .currency("USD")
                .provider("PAYPAL")
                .providerOrderId("PAY-ORD-100")
                .providerCaptureId("PAY-CAP-100")
                .status(Payment.PaymentStatus.CAPTURED)
                .verifiedAt(Instant.now())
                .build();
        paymentRepository.save(capturedPayment);

        when(paypalService.createPayout(any(), any(), any(), any(), any(), any()))
                .thenReturn(new PayPalService.PayoutResult("batch-test-100", "SUCCESS", false, "Payout succeeded"));

        // 9. Client authorizes release
        Map<String, Object> releaseResp = milestoneService.releaseMilestone(m1.getId(), "Alice Client", "bob@example.com");
        assertNotNull(releaseResp);
        assertEquals(m1.getId(), releaseResp.get("milestoneId"));
        assertEquals("batch-test-100", releaseResp.get("payoutBatchId"));

        // 10. Dispute pack assembly
        Map<String, Object> disputePack = milestoneService.getDisputePack(m1.getId());
        assertNotNull(disputePack);
        assertNotNull(disputePack.get("project"));
        assertNotNull(disputePack.get("submissions"));
    }

    @Test
    @DisplayName("Role spoofing on accept and release is blocked (HTTP 403)")
    void roleSpoofingBlocked() throws Exception {
        Project project = projectService.createProject("Role Security Project", "Testing spoofing", "Sarah", null, "Alex", null, new BigDecimal("500"), "USD");
        Milestone m = projectService.createMilestone(project.getId(), "Task 1", new BigDecimal("500"), "2025-10-30", "Code", "Pass", "Desc", null);

        // Submit evidence as freelancer
        milestoneService.submitEvidence(m.getId(), "Alex", "Finished work", "https://github.com/alex", "app.zip");

        // 1. Attempt to accept milestone as freelancer -> must be 403 Forbidden
        mockMvc.perform(post("/api/milestones/" + m.getId() + "/accept")
                        .header("X-Actor-Role", "freelancer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());

        // 2. Attempt to release milestone as freelancer -> must be 403 Forbidden
        mockMvc.perform(post("/api/milestones/" + m.getId() + "/release")
                        .header("X-Actor-Role", "freelancer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());

        // 3. Attempt to approve freelancer contract as client -> must be 403 Forbidden
        ContractVersion cv = contractService.saveDraft(project.getId(), "{}");
        mockMvc.perform(post("/api/projects/" + project.getId() + "/contract-versions/" + cv.getId() + "/approve")
                        .header("X-Actor-Role", "client")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"freelancer\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Failed capture and 422 from PayPal returns 4xx error status")
    void failedCaptureReturnsErrorStatus() throws Exception {
        Project project = projectService.createProject("Capture Test", "Testing capture failure", "C", null, "F", null, new BigDecimal("400"), "USD");
        Milestone m = projectService.createMilestone(project.getId(), "M422", new BigDecimal("400"), "2025-10-30", "D", "AC", "Desc", null);

        Payment payment = Payment.builder()
                .projectId(project.getId())
                .milestoneId(m.getId())
                .amount(new BigDecimal("400"))
                .currency("USD")
                .provider("PAYPAL")
                .providerOrderId("ORD-FAIL-422")
                .status(Payment.PaymentStatus.APPROVAL_PENDING)
                .build();
        paymentRepository.save(payment);

        when(paypalService.captureOrder("ORD-FAIL-422"))
                .thenThrow(new RuntimeException("PayPal capture error (422 UNPROCESSABLE_ENTITY): TRANSACTION_REFUSED"));

        // Capture request must fail with an error response (NOT HTTP 200 with fake COMPLETED)
        assertThrows(RuntimeException.class, () -> paymentService.captureOrder("ORD-FAIL-422"));

        // Reject unknown order IDs without creating fake payments
        mockMvc.perform(post("/api/payments/paypal/orders/UNKNOWN_ORDER_999/capture"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Forged signature and duplicate webhook handling")
    void forgedAndDuplicateWebhookHandling() throws Exception {
        when(paypalService.isConfigured()).thenReturn(true);
        when(paypalService.verifyWebhookSignature(any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(false); // Forged signature

        // 1. Forged signature webhook receives received with status FAILED
        mockMvc.perform(post("/api/webhooks/paypal")
                        .header("PAYPAL-TRANSMISSION-ID", "fake-tx-123")
                        .header("PAYPAL-TRANSMISSION-SIG", "fake-sig")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"id\":\"WH-FORGED-1\",\"event_type\":\"PAYMENT.CAPTURE.COMPLETED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.verificationStatus").value("FAILED"));

        // 2. Duplicate webhook event gets duplicate_ignored
        mockMvc.perform(post("/api/webhooks/paypal")
                        .header("PAYPAL-TRANSMISSION-ID", "fake-tx-123")
                        .header("PAYPAL-TRANSMISSION-SIG", "fake-sig")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"id\":\"WH-FORGED-1\",\"event_type\":\"PAYMENT.CAPTURE.COMPLETED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("duplicate_ignored"));
    }

    @Test
    @DisplayName("Double release returns same payout idempotently")
    void doubleReleaseReturnsSamePayoutIdempotently() {
        Project project = projectService.createProject("Idempotent Release", "Testing double release", "Client", null, "Dev", "dev@example.com", new BigDecimal("300"), "USD");
        Milestone m = projectService.createMilestone(project.getId(), "Milestone Release", new BigDecimal("300"), "2025-10-30", "Work", "Good", "Desc", null);

        milestoneService.submitEvidence(m.getId(), "Dev", "Finished", "link", "file");
        milestoneService.acceptMilestone(m.getId(), "Client");

        Payment p = Payment.builder()
                .projectId(project.getId())
                .milestoneId(m.getId())
                .amount(new BigDecimal("300"))
                .currency("USD")
                .provider("PAYPAL")
                .providerOrderId("ORD-IDEMP-01")
                .status(Payment.PaymentStatus.CAPTURED)
                .build();
        paymentRepository.save(p);

        when(paypalService.createPayout(any(), any(), any(), any(), any(), any()))
                .thenReturn(new PayPalService.PayoutResult("batch-idemp-01", "SUCCESS", false, "Payout batch created"));

        // First release call
        Map<String, Object> firstRelease = milestoneService.releaseMilestone(m.getId(), "Client", "dev@example.com");
        assertEquals(false, firstRelease.get("alreadyReleased"));
        assertEquals("batch-idemp-01", firstRelease.get("payoutBatchId"));

        // Second release call (double release) -> must return same payout record idempotently
        Map<String, Object> secondRelease = milestoneService.releaseMilestone(m.getId(), "Client", "dev@example.com");
        assertEquals(true, secondRelease.get("alreadyReleased"));
        assertEquals("batch-idemp-01", secondRelease.get("payoutBatchId"));
    }

    @Test
    @DisplayName("Release with only DEMO_ESCROW payment produces DEMO_SIMULATED release status")
    void releaseWithDemoEscrowProducesDemoSimulated() {
        Project project = projectService.createProject("Simulated Release", "Testing simulated payout", "Sarah", null, "Alex", "alex@example.com", new BigDecimal("250"), "USD");
        Milestone m = projectService.createMilestone(project.getId(), "Design Phase", new BigDecimal("250"), "2025-10-30", "Figma", "Pixel perfect", "Desc", null);

        milestoneService.submitEvidence(m.getId(), "Alex", "Designs uploaded", "figma.com", "spec.pdf");
        milestoneService.acceptMilestone(m.getId(), "Sarah");

        // Fund with DEMO_ESCROW
        paymentService.recordDemoPayment(project.getId(), m.getId(), new BigDecimal("250"), "USD");

        // Release milestone
        Map<String, Object> release = milestoneService.releaseMilestone(m.getId(), "Sarah", "alex@example.com");
        assertEquals("DEMO_SIMULATED", release.get("payoutStatus"));
        assertEquals(true, release.get("isSimulated"));
        assertEquals("DEMO_ESCROW", release.get("provider"));
    }

    @Test
    @DisplayName("AI schema validation validates response and rejects malformed schema")
    void aiSchemaValidationRejectsMalformedResponse() {
        // Valid evaluation JSON passes
        String validJson = """
                {
                  "criterionResults": [
                    {
                      "criterion": "Responsive design",
                      "status": "MET",
                      "evidence": "Matches mobile and desktop viewports",
                      "gap": null,
                      "confidence": "high"
                    }
                  ],
                  "overallSummary": "All criteria met.",
                  "missingEvidence": [],
                  "uncertainties": [],
                  "recommendedNextStep": "Approve milestone",
                  "aiDisclaimer": "Advisory only"
                }
                """;
        String validated = aiService.validateEvaluationSchema(validJson, "Responsive design");
        assertNotNull(validated);

        // Missing criterionResults throws schema error
        String malformedJson = "{\"overallSummary\":\"No results here\"}";
        assertThrows(RuntimeException.class, () -> aiService.validateEvaluationSchema(malformedJson, "Criteria"));

        // Malformed contract extraction throws error
        String invalidContract = "{\"deliverables\":[\"App\"]}";
        assertThrows(RuntimeException.class, () -> aiService.validateContractExtractionSchema(invalidContract));
    }

    @Test
    @DisplayName("Mock PayPal returns CREATED order: response must not be CAPTURED and payment not CAPTURED")
    void captureReturnsCreatedNotCaptured() throws Exception {
        Project project = projectService.createProject("Created Order Test", "Desc", "Client", null, "Freelancer", null, new BigDecimal("500"), "USD");
        Milestone m = projectService.createMilestone(project.getId(), "M-Created", new BigDecimal("500"), "2025-10-30", "D", "AC", "Desc", null);

        Payment payment = Payment.builder()
                .projectId(project.getId())
                .milestoneId(m.getId())
                .amount(new BigDecimal("500"))
                .currency("USD")
                .provider("PAYPAL")
                .providerOrderId("ORD-CREATED-123")
                .status(Payment.PaymentStatus.APPROVAL_PENDING)
                .build();
        paymentRepository.save(payment);

        when(paypalService.captureOrder("ORD-CREATED-123"))
                .thenReturn(new PayPalService.PayPalCaptureResult("ORD-CREATED-123", null, "CREATED", new BigDecimal("500"), "USD"));

        mockMvc.perform(post("/api/payments/paypal/orders/ORD-CREATED-123/capture"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.status").value("FAILED"))
                .andExpect(jsonPath("$.status").value(org.hamcrest.Matchers.not("CAPTURED")));

        Payment stored = paymentRepository.findByProviderOrderId("ORD-CREATED-123").orElseThrow();
        assertNotEquals(Payment.PaymentStatus.CAPTURED, stored.getStatus());
        assertEquals(Payment.PaymentStatus.FAILED, stored.getStatus());
    }

    @Test
    @DisplayName("Mock 422 INSTRUMENT_DECLINED: expect 422 and payment marked FAILED")
    void captureDeclinedReturns422AndPaymentFailed() throws Exception {
        Project project = projectService.createProject("Declined Test", "Desc", "Client", null, "Freelancer", null, new BigDecimal("400"), "USD");
        Milestone m = projectService.createMilestone(project.getId(), "M-Declined", new BigDecimal("400"), "2025-10-30", "D", "AC", "Desc", null);

        Payment payment = Payment.builder()
                .projectId(project.getId())
                .milestoneId(m.getId())
                .amount(new BigDecimal("400"))
                .currency("USD")
                .provider("PAYPAL")
                .providerOrderId("ORD-DECLINED-422")
                .status(Payment.PaymentStatus.APPROVAL_PENDING)
                .build();
        paymentRepository.save(payment);

        String rawError = "{\"name\":\"UNPROCESSABLE_ENTITY\",\"message\":\"The requested action failed business validation.\",\"debug_id\":\"dbg-422-inst\",\"details\":[{\"issue\":\"INSTRUMENT_DECLINED\",\"description\":\"The instrument presented was declined\"}]}";
        when(paypalService.captureOrder("ORD-DECLINED-422"))
                .thenThrow(new PayPalApiException(422, rawError));

        mockMvc.perform(post("/api/payments/paypal/orders/ORD-DECLINED-422/capture"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("INSTRUMENT_DECLINED")))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("dbg-422-inst"))));

        Payment stored = paymentRepository.findByProviderOrderId("ORD-DECLINED-422").orElseThrow();
        assertEquals(Payment.PaymentStatus.FAILED, stored.getStatus());
    }

    @Test
    @DisplayName("Mock PayPal 5xx: expect 502 and no payment marked captured")
    void capture5xxReturns502AndPaymentNotCaptured() throws Exception {
        Project project = projectService.createProject("5xx Test", "Desc", "Client", null, "Freelancer", null, new BigDecimal("350"), "USD");
        Milestone m = projectService.createMilestone(project.getId(), "M-500", new BigDecimal("350"), "2025-10-30", "D", "AC", "Desc", null);

        Payment payment = Payment.builder()
                .projectId(project.getId())
                .milestoneId(m.getId())
                .amount(new BigDecimal("350"))
                .currency("USD")
                .provider("PAYPAL")
                .providerOrderId("ORD-500-ERR")
                .status(Payment.PaymentStatus.APPROVAL_PENDING)
                .build();
        paymentRepository.save(payment);

        String raw500 = "{\"name\":\"INTERNAL_SERVER_ERROR\",\"message\":\"An internal server error occurred.\",\"debug_id\":\"dbg-500-paypal\"}";
        when(paypalService.captureOrder("ORD-500-ERR"))
                .thenThrow(new PayPalApiException(500, raw500));

        mockMvc.perform(post("/api/payments/paypal/orders/ORD-500-ERR/capture"))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.status").value(502))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("dbg-500-paypal"))));

        Payment stored = paymentRepository.findByProviderOrderId("ORD-500-ERR").orElseThrow();
        assertNotEquals(Payment.PaymentStatus.CAPTURED, stored.getStatus());
        assertEquals(Payment.PaymentStatus.FAILED, stored.getStatus());
    }

    @Test
    @DisplayName("Amount differs from milestone amount: expect not CAPTURED")
    void captureAmountMismatchNotCaptured() throws Exception {
        Project project = projectService.createProject("Mismatch Test", "Desc", "Client", null, "Freelancer", null, new BigDecimal("400"), "USD");
        Milestone m = projectService.createMilestone(project.getId(), "M-Mismatch", new BigDecimal("400"), "2025-10-30", "D", "AC", "Desc", null);

        Payment payment = Payment.builder()
                .projectId(project.getId())
                .milestoneId(m.getId())
                .amount(new BigDecimal("400"))
                .currency("USD")
                .provider("PAYPAL")
                .providerOrderId("ORD-MISMATCH-AMT")
                .status(Payment.PaymentStatus.APPROVAL_PENDING)
                .build();
        paymentRepository.save(payment);

        // PayPal returned COMPLETED, but for $150 instead of milestone's $400
        when(paypalService.captureOrder("ORD-MISMATCH-AMT"))
                .thenReturn(new PayPalService.PayPalCaptureResult("ORD-MISMATCH-AMT", "CAP-150", "COMPLETED", new BigDecimal("150.00"), "USD"));

        mockMvc.perform(post("/api/payments/paypal/orders/ORD-MISMATCH-AMT/capture"))
                .andExpect(status().isConflict())   // 409: indeterminate, not a bad client request
                .andExpect(jsonPath("$.status").value(org.hamcrest.Matchers.not("CAPTURED")))
                .andExpect(jsonPath("$.status").value("UNKNOWN"))
                .andExpect(jsonPath("$.mismatch").value(true))
                .andExpect(jsonPath("$.capturedAmount").value("150.00"));

        Payment stored = paymentRepository.findByProviderOrderId("ORD-MISMATCH-AMT").orElseThrow();
        assertNotEquals(Payment.PaymentStatus.CAPTURED, stored.getStatus());
        assertEquals(Payment.PaymentStatus.UNKNOWN, stored.getStatus());
        // Real captured values must be persisted so reconciliation / refund is possible.
        assertNotNull(stored.getCapturedAmount());
        assertEquals(0, new BigDecimal("150.00").compareTo(stored.getCapturedAmount()));
        assertEquals("USD", stored.getCapturedCurrency());
        // Capture ID should be stored too so PayPal support can look it up.
        assertEquals("CAP-150", stored.getProviderCaptureId());
    }

    @Test
    @DisplayName("Network timeout maps to UNKNOWN state, not FAILED, returning 504 Gateway Timeout")
    void captureTimeoutMapsToUnknownAnd504() throws Exception {
        Project project = projectService.createProject("Timeout Test", "Desc", "Client", null, "Freelancer", null, new BigDecimal("400"), "USD");
        Milestone m = projectService.createMilestone(project.getId(), "M-Timeout", new BigDecimal("400"), "2025-10-30", "D", "AC", "Desc", null);

        Payment payment = Payment.builder()
                .projectId(project.getId())
                .milestoneId(m.getId())
                .amount(new BigDecimal("400"))
                .currency("USD")
                .provider("PAYPAL")
                .providerOrderId("ORD-TIMEOUT-NET")
                .status(Payment.PaymentStatus.APPROVAL_PENDING)
                .build();
        paymentRepository.save(payment);

        when(paypalService.captureOrder("ORD-TIMEOUT-NET"))
                .thenThrow(new PayPalCaptureTimeoutException("ORD-TIMEOUT-NET", new java.util.concurrent.TimeoutException("Read timed out")));

        mockMvc.perform(post("/api/payments/paypal/orders/ORD-TIMEOUT-NET/capture"))
                .andExpect(status().isGatewayTimeout())
                .andExpect(jsonPath("$.status").value(504))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("UNKNOWN")));

        Payment stored = paymentRepository.findByProviderOrderId("ORD-TIMEOUT-NET").orElseThrow();
        assertEquals(Payment.PaymentStatus.UNKNOWN, stored.getStatus());
        assertNotEquals(Payment.PaymentStatus.FAILED, stored.getStatus());
        assertNotEquals(Payment.PaymentStatus.CAPTURED, stored.getStatus());
    }

    @Test
    @DisplayName("IllegalStateException returns 409 CONFLICT rather than 500")
    void illegalStateExceptionReturns409Conflict() throws Exception {
        Project project = projectService.createProject("Conflict Test", "Desc", "Client", null, "Freelancer", null, new BigDecimal("200"), "USD");
        Milestone m = projectService.createMilestone(project.getId(), "M-Conflict", new BigDecimal("200"), "2025-10-30", "D", "AC", "Desc", null);

        // Attempting to release milestone that is neither submitted nor accepted nor funded throws IllegalStateException
        // Must present a valid client token — X-Actor-Role alone no longer grants a role.
        mockMvc.perform(post("/api/milestones/" + m.getId() + "/release")
                        .header("Authorization", "Bearer client-demo-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"recipientEmail\":\"f@example.com\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.error").value("Conflict"));
    }

    @Test
    @DisplayName("Capture COMPLETED maps to CAPTURED when amount and currency match")
    void captureCompletedMapsToCapturedWhenAmountMatches() throws Exception {
        Project project = projectService.createProject("Success Capture", "Desc", "Client", null, "Freelancer", null, new BigDecimal("400"), "USD");
        Milestone m = projectService.createMilestone(project.getId(), "M-Success", new BigDecimal("400"), "2025-10-30", "D", "AC", "Desc", null);

        Payment payment = Payment.builder()
                .projectId(project.getId())
                .milestoneId(m.getId())
                .amount(new BigDecimal("400"))
                .currency("USD")
                .provider("PAYPAL")
                .providerOrderId("ORD-SUCCESS-200")
                .status(Payment.PaymentStatus.APPROVAL_PENDING)
                .build();
        paymentRepository.save(payment);

        when(paypalService.captureOrder("ORD-SUCCESS-200"))
                .thenReturn(new PayPalService.PayPalCaptureResult("ORD-SUCCESS-200", "CAP-SUCCESS-999", "COMPLETED", new BigDecimal("400.00"), "USD"));

        mockMvc.perform(post("/api/payments/paypal/orders/ORD-SUCCESS-200/capture"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CAPTURED"))
                .andExpect(jsonPath("$.providerStatus").value("COMPLETED"))
                .andExpect(jsonPath("$.captureId").value("CAP-SUCCESS-999"));

        Payment stored = paymentRepository.findByProviderOrderId("ORD-SUCCESS-200").orElseThrow();
        assertEquals(Payment.PaymentStatus.CAPTURED, stored.getStatus());
        assertEquals("CAP-SUCCESS-999", stored.getProviderCaptureId());
    }
}

