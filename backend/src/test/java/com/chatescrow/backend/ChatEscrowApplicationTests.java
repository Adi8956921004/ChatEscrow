package com.chatescrow.backend;

import com.chatescrow.backend.model.*;
import com.chatescrow.backend.repository.*;
import com.chatescrow.backend.service.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class ChatEscrowApplicationTests {

    @Autowired
    private ProjectService projectService;

    @Autowired
    private ContractService contractService;

    @Autowired
    private MilestoneService milestoneService;

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private ContractVersionRepository contractVersionRepository;

    @Autowired
    private MilestoneRepository milestoneRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private AuditEventRepository auditEventRepository;

    @Autowired
    private PaymentService paymentService;

    @Autowired
    private com.chatescrow.backend.ai.AiService aiService;

    @Autowired
    private com.chatescrow.backend.controller.WebhookController webhookController;

    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper = new com.fasterxml.jackson.databind.ObjectMapper();

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
    @DisplayName("End-to-end workflow: Create Project -> Draft Contract -> Mutual Approval -> Milestones -> Submit -> AI Eval -> Client Decision")
    void endToEndJourneyWorkflow() {
        // 1. Create a new project
        Project project = projectService.createProject(
                "Mobile App Redesign",
                "Redesign React Native mobile application",
                "Alice Client",
                "Bob Dev",
                new BigDecimal("2500"),
                "USD"
        );
        assertNotNull(project.getId());
        assertEquals(Project.ProjectStatus.ACTIVE, project.getStatus());

        // 2. Generate AI contract draft from pasted conversation
        String conversation = """
                Alice: Hi Bob, we need a complete mobile app redesign. Budget is $2500.
                Bob: Sounds good! Milestone 1: Wireframes ($1000, due in 2 weeks).
                Bob: Milestone 2: UI Implementation ($1500, due in 4 weeks).
                Alice: Great! We require Figma components and 2 revision rounds.
                """;
        ContractVersion draft = contractService.generateDraftFromConversation(project.getId(), conversation);
        assertNotNull(draft);
        assertEquals(1, draft.getVersionNumber());
        assertEquals(ContractVersion.ApprovalStatus.PENDING, draft.getClientApprovalStatus());
        assertEquals(ContractVersion.ApprovalStatus.PENDING, draft.getFreelancerApprovalStatus());

        // 3. Mutual Approval: Client approves
        ContractVersion afterClientApprove = contractService.approveVersion(draft.getId(), "client");
        assertEquals(ContractVersion.ApprovalStatus.APPROVED, afterClientApprove.getClientApprovalStatus());
        assertEquals(ContractVersion.ApprovalStatus.PENDING, afterClientApprove.getFreelancerApprovalStatus());
        assertFalse(afterClientApprove.isAgreed());

        // Mutual Approval: Freelancer approves -> Contract becomes AGREED
        ContractVersion fullyApproved = contractService.approveVersion(draft.getId(), "freelancer");
        assertEquals(ContractVersion.ApprovalStatus.APPROVED, fullyApproved.getFreelancerApprovalStatus());
        assertTrue(fullyApproved.isAgreed(), "Contract must be marked agreed once both parties approve");

        // 4. Milestone lifecycle
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

        // Verify milestone status transitioned to SUBMITTED
        Milestone submittedMilestone = milestoneRepository.findById(m1.getId()).orElseThrow();
        assertEquals(Milestone.MilestoneStatus.SUBMITTED, submittedMilestone.getStatus());

        // 6. AI Acceptance Gate evaluation
        AcceptanceReport report = milestoneService.evaluateSubmission(sub.getId());
        assertNotNull(report);
        assertNotNull(report.getCriterionResultsJson());
        assertNotNull(report.getEvidenceSummary());

        // 7. Client Decision: Request revision
        Milestone revisedMilestone = milestoneService.requestRevision(m1.getId(), "Alice Client", "Please add dark mode wireframes");
        assertEquals(Milestone.MilestoneStatus.REVISION_REQUESTED, revisedMilestone.getStatus());

        // Freelancer resubmits
        Submission sub2 = milestoneService.submitEvidence(
                m1.getId(),
                "Bob Dev",
                "Added dark mode wireframes as requested",
                "https://figma.com/file/demo123-dark",
                "wireframes-v2.pdf"
        );
        assertNotNull(sub2);

        // Client Decision: Accept milestone
        Milestone acceptedMilestone = milestoneService.acceptMilestone(m1.getId(), "Alice Client");
        assertEquals(Milestone.MilestoneStatus.ACCEPTED, acceptedMilestone.getStatus());

        // 8. Milestone Payout/Release Workflow
        Map<String, Object> releaseResp = milestoneService.releaseMilestone(
                m1.getId(), "Alice Client", "bob@example.com");
        assertNotNull(releaseResp);
        assertEquals(m1.getId(), releaseResp.get("milestoneId"));
        assertNotNull(releaseResp.get("payoutBatchId"));

        // 9. Dispute & Evidence Pack assembly
        Map<String, Object> disputePack = milestoneService.getDisputePack(m1.getId());
        assertNotNull(disputePack);
        assertNotNull(disputePack.get("project"));
        assertNotNull(disputePack.get("milestone"));
        assertNotNull(disputePack.get("submissions"));
        assertNotNull(disputePack.get("auditTimeline"));

        // 10. Verify auditable timeline
        List<AuditEvent> timeline = projectService.getTimeline(project.getId());
        assertFalse(timeline.isEmpty(), "Audit timeline must record all critical events");
        assertTrue(timeline.stream().anyMatch(e -> "CONTRACT_AGREED".equals(e.getEventType())));
        assertTrue(timeline.stream().anyMatch(e -> "MILESTONE_ACCEPTED".equals(e.getEventType())));
        assertTrue(timeline.stream().anyMatch(e -> "MILESTONE_PAYOUT_RELEASED".equals(e.getEventType())));
    }

    @Test
    @DisplayName("Release milestone cannot be called on non-accepted milestone")
    void releaseMilestoneFailsWhenNotAccepted() {
        Project project = projectService.createProject("Test", "Desc", "C", "F", new BigDecimal("500"), "USD");
        Milestone m = projectService.createMilestone(project.getId(), "M1", new BigDecimal("500"), "2025-11-01", "D", "AC", "Desc", null);
        assertEquals(Milestone.MilestoneStatus.NOT_STARTED, m.getStatus());

        assertThrows(IllegalStateException.class, () ->
                milestoneService.releaseMilestone(m.getId(), "C", "f@example.com"));
    }

    @Test
    @DisplayName("Escrow Lifecycle: Fund milestone, refund escrow to client, and verify audit records")
    void testEscrowFundingAndRefund() {
        Project project = projectService.createProject("Escrow Refund Test", "Testing refund", "Alice", "Bob", new BigDecimal("1200"), "USD");
        Milestone m = projectService.createMilestone(project.getId(), "API Setup", new BigDecimal("1200"), "2025-12-01", "API Docs", "100% test pass", "Setup API", null);
        assertEquals(Milestone.MilestoneStatus.NOT_STARTED, m.getStatus());

        // Process refund of escrow
        Milestone refunded = milestoneService.refundMilestoneEscrow(m.getId(), "Alice", "Scope altered by mutual consent");
        assertNotNull(refunded);
        assertEquals(Milestone.MilestoneStatus.NOT_STARTED, refunded.getStatus());

        // Verify audit event
        List<AuditEvent> timeline = projectService.getTimeline(project.getId());
        assertTrue(timeline.stream().anyMatch(e -> "MILESTONE_ESCROW_REFUNDED".equals(e.getEventType())));
    }

    @Test
    @DisplayName("Escrow Dispute Flow: Flag disagreement -> AI Mediation advisory -> Mutual resolution (split 50/50)")
    void testDisputeFlaggingAiMediationAndMutualResolution() {
        Project project = projectService.createProject("Dispute Mediation Test", "Testing AI Mediation", "Alice", "Bob", new BigDecimal("800"), "USD");
        Milestone m = projectService.createMilestone(project.getId(), "Design Phase", new BigDecimal("800"), "2025-11-15", "Design System", "Pixel-perfect tokens", "Design", null);

        // Submit evidence
        Submission sub = milestoneService.submitEvidence(m.getId(), "Bob", "Designs submitted", "https://figma.com/demo", "spec.pdf");
        assertNotNull(sub);

        // Flag disagreement
        Milestone disputed = milestoneService.flagDisagreement(m.getId(), "Alice", "Deliverable misses mobile breakpoint specifications");
        assertEquals(Milestone.MilestoneStatus.DISAGREEMENT_FLAGGED, disputed.getStatus());

        // Request AI Dispute Mediation
        Map<String, Object> mediation = milestoneService.aiMediateDispute(m.getId());
        assertNotNull(mediation);
        assertEquals("Design Phase", mediation.get("milestoneTitle"));
        assertEquals(0, new BigDecimal("800").compareTo((BigDecimal) mediation.get("amount")));
        assertEquals("MUTUAL_SPLIT_50_50", mediation.get("recommendedResolution"));
        assertEquals(0, new BigDecimal("400").compareTo((BigDecimal) mediation.get("recommendedSplitClient")));
        assertEquals(0, new BigDecimal("400").compareTo((BigDecimal) mediation.get("recommendedSplitFreelancer")));
        assertNotNull(mediation.get("analysis"));
        assertNotNull(mediation.get("advisoryNote"));

        // Mutual settlement (50/50 split)
        Map<String, Object> resolution = milestoneService.resolveDispute(m.getId(), "Alice", "split", "Agreed to 50/50 split per AI recommendation");
        assertNotNull(resolution);
        assertEquals("MUTUAL_SPLIT_50_50", resolution.get("status"));
        assertEquals("split", resolution.get("resolution"));

        // Verify milestone is updated to ACCEPTED
        Milestone resolvedMilestone = milestoneRepository.findById(m.getId()).orElseThrow();
        assertEquals(Milestone.MilestoneStatus.ACCEPTED, resolvedMilestone.getStatus());

        // Verify audit timeline contains dispute events
        List<AuditEvent> timeline = projectService.getTimeline(project.getId());
        assertTrue(timeline.stream().anyMatch(e -> "MILESTONE_DISAGREEMENT_FLAGGED".equals(e.getEventType())));
        assertTrue(timeline.stream().anyMatch(e -> "DISPUTE_MUTUALLY_RESOLVED".equals(e.getEventType())));
    }

    @Test
    @DisplayName("Payment Record Refund: Verify payment cancellation and audit logging")
    void testPaymentRecordRefund() {
        Project project = projectService.createProject("Payment Refund Test", "Testing payment refund", "ClientX", "FreelancerY", new BigDecimal("500"), "USD");
        Payment payment = Payment.builder()
                .projectId(project.getId())
                .amount(new BigDecimal("500"))
                .currency("USD")
                .provider("PAYPAL")
                .status(Payment.PaymentStatus.CAPTURED)
                .build();
        payment = paymentRepository.save(payment);

        Payment refunded = paymentService.refundPayment(payment.getId(), "Client requested project cancellation");
        assertNotNull(refunded);
        assertEquals(Payment.PaymentStatus.CANCELLED, refunded.getStatus());

        List<AuditEvent> timeline = projectService.getTimeline(project.getId());
        assertTrue(timeline.stream().anyMatch(e -> "ESCROW_REFUND_PROCESSED".equals(e.getEventType())));
    }
}
