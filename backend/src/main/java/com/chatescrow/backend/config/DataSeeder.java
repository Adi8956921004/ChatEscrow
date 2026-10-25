package com.chatescrow.backend.config;

import com.chatescrow.backend.model.*;
import com.chatescrow.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/**
 * Seeds demo data on startup so the hackathon demo can be run without manual setup.
 * Data resets on every restart (H2 in-memory).
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final ProjectRepository projectRepo;
    private final ContractVersionRepository contractRepo;
    private final MilestoneRepository milestoneRepo;
    private final AuditEventRepository auditRepo;
    private final PaymentRepository paymentRepo;
    private final SubmissionRepository submissionRepo;

    @Override
    public void run(String... args) {
        log.info("Seeding demo data...");

        // Demo project
        Project project = projectRepo.save(Project.builder()
                .id("demo-project-001")
                .title("E-commerce Website Development")
                .description("Design and develop a responsive e-commerce website for North & Pine.")
                .clientName("Sarah Miller")
                .clientEmail("sarah@example.com")
                .freelancerName("Alex Carter")
                .freelancerEmail("alex@example.com")
                .currency("USD")
                .totalBudget(new BigDecimal("1200"))
                .status(Project.ProjectStatus.ACTIVE)
                .createdAt(Instant.parse("2025-08-12T09:00:00Z"))
                .updatedAt(Instant.now())
                .build());

        // Demo contract version (agreed)
        String termsJson = """
                {
                  "projectSummary": "Design and develop a responsive e-commerce website for North & Pine, including storefront, product catalog, cart, and secure checkout integration.",
                  "parties": {"client": "Sarah Miller", "freelancer": "Alex Carter"},
                  "deliverables": ["Responsive storefront", "Product catalog", "Shopping cart", "Checkout integration", "QA & Delivery"],
                  "milestones": [
                    {"title": "Design", "amount": 250, "currency": "USD", "dueDate": "2025-08-22", "deliverables": ["Homepage mockups", "Product page design", "Cart/checkout flow"], "acceptanceCriteria": ["Responsive desktop and mobile layouts", "Brand system applied consistently", "Client feedback incorporated"]},
                    {"title": "Frontend Development", "amount": 400, "currency": "USD", "dueDate": "2025-09-05", "deliverables": ["Responsive React pages", "Reusable product components", "Interactive cart experience"], "acceptanceCriteria": ["Matches approved designs", "Works across modern browsers", "Lighthouse accessibility score above 90"]},
                    {"title": "Backend Integration", "amount": 350, "currency": "USD", "dueDate": "2025-09-19", "deliverables": ["Product API integration", "Customer account flow", "Sandbox checkout connection"], "acceptanceCriteria": ["Errors handled clearly", "Inventory updates correctly", "Sandbox checkout completes end-to-end"]},
                    {"title": "Final Delivery", "amount": 200, "currency": "USD", "dueDate": "2025-09-30", "deliverables": ["QA report", "Deployment guide", "Source code handoff"], "acceptanceCriteria": ["No blocking defects", "Documentation is complete", "Client sign-off received"]}
                  ],
                  "revisionPolicy": "Up to 2 revision rounds per milestone",
                  "assumptions": ["Work delivered incrementally per milestone", "Client provides brand assets and copy"],
                  "missingInformation": [],
                  "itemsNeedingConfirmation": [],
                  "isDraft": false
                }
                """;

        ContractVersion contract = contractRepo.save(ContractVersion.builder()
                .id("demo-contract-v1")
                .projectId(project.getId())
                .versionNumber(1)
                .termsJson(termsJson)
                .generatedFromConversation(true)
                .clientApprovalStatus(ContractVersion.ApprovalStatus.APPROVED)
                .freelancerApprovalStatus(ContractVersion.ApprovalStatus.APPROVED)
                .clientApprovedAt(Instant.parse("2025-08-12T11:00:00Z"))
                .freelancerApprovedAt(Instant.parse("2025-08-12T11:30:00Z"))
                .createdAt(Instant.parse("2025-08-12T10:00:00Z"))
                .build());

        // Demo milestones
        Milestone m1 = milestoneRepo.save(Milestone.builder()
                .id("demo-milestone-design")
                .projectId(project.getId())
                .contractVersionId(contract.getId())
                .title("Design")
                .amount(new BigDecimal("250"))
                .currency("USD")
                .dueDate(LocalDate.of(2025, 8, 22))
                .deliverables("Homepage mockups|Product page design|Cart/checkout flow")
                .acceptanceCriteria("Responsive desktop and mobile layouts|Brand system applied consistently|Client feedback incorporated")
                .description("Complete high-fidelity designs for the core shopping experience.")
                .status(Milestone.MilestoneStatus.ACCEPTED)
                .createdAt(Instant.parse("2025-08-12T10:30:00Z"))
                .updatedAt(Instant.parse("2025-08-22T16:00:00Z"))
                .build());

        Milestone m2 = milestoneRepo.save(Milestone.builder()
                .id("demo-milestone-frontend")
                .projectId(project.getId())
                .contractVersionId(contract.getId())
                .title("Frontend Development")
                .amount(new BigDecimal("400"))
                .currency("USD")
                .dueDate(LocalDate.of(2025, 9, 5))
                .deliverables("Responsive React pages|Reusable product components|Interactive cart experience")
                .acceptanceCriteria("Matches approved designs|Works across modern browsers|Lighthouse accessibility score above 90")
                .description("Build the responsive storefront and customer shopping flow.")
                .status(Milestone.MilestoneStatus.SUBMITTED)
                .createdAt(Instant.parse("2025-08-22T17:00:00Z"))
                .updatedAt(Instant.parse("2025-08-25T09:18:00Z"))
                .build());

        milestoneRepo.save(Milestone.builder()
                .id("demo-milestone-backend")
                .projectId(project.getId())
                .contractVersionId(contract.getId())
                .title("Backend Integration")
                .amount(new BigDecimal("350"))
                .currency("USD")
                .dueDate(LocalDate.of(2025, 9, 19))
                .deliverables("Product API integration|Customer account flow|Sandbox checkout connection")
                .acceptanceCriteria("Errors handled clearly|Inventory updates correctly|Sandbox checkout completes end-to-end")
                .description("Connect product, inventory, account, and checkout services.")
                .status(Milestone.MilestoneStatus.NOT_STARTED)
                .createdAt(Instant.parse("2025-08-22T17:01:00Z"))
                .updatedAt(Instant.parse("2025-08-22T17:01:00Z"))
                .build());

        milestoneRepo.save(Milestone.builder()
                .id("demo-milestone-delivery")
                .projectId(project.getId())
                .contractVersionId(contract.getId())
                .title("Final Delivery")
                .amount(new BigDecimal("200"))
                .currency("USD")
                .dueDate(LocalDate.of(2025, 9, 30))
                .deliverables("QA report|Deployment guide|Source code handoff")
                .acceptanceCriteria("No blocking defects|Documentation is complete|Client sign-off received")
                .description("Complete quality assurance, handoff, and launch preparation.")
                .status(Milestone.MilestoneStatus.NOT_STARTED)
                .createdAt(Instant.parse("2025-08-22T17:02:00Z"))
                .updatedAt(Instant.parse("2025-08-22T17:02:00Z"))
                .build());

        // Demo submission for m2
        submissionRepo.save(Submission.builder()
                .id("demo-submission-frontend")
                .milestoneId(m2.getId())
                .submittedBy("Alex Carter (Freelancer)")
                .description("Completed responsive storefront with all 8 Figma frames, product catalog grid, cart drawer, and responsive checkout integration.")
                .evidenceLinks("https://preview.northandpine.store, https://github.com/alexcarter/north-pine-storefront")
                .fileReferences("lighthouse-report.pdf")
                .createdAt(Instant.parse("2025-08-25T09:18:00Z"))
                .build());

        // Demo payment (design milestone captured)
        paymentRepo.save(Payment.builder()
                .id("demo-payment-design")
                .projectId(project.getId())
                .milestoneId(m1.getId())
                .provider("PAYPAL")
                .providerOrderId("DEMO_ORDER_001")
                .providerCaptureId("DEMO_CAPTURE_001")
                .amount(new BigDecimal("250"))
                .currency("USD")
                .status(Payment.PaymentStatus.CAPTURED)
                .verifiedAt(Instant.parse("2025-08-22T17:30:00Z"))
                .createdAt(Instant.parse("2025-08-22T17:00:00Z"))
                .updatedAt(Instant.parse("2025-08-22T17:30:00Z"))
                .build());

        // Demo audit trail
        auditRepo.save(AuditEvent.builder().projectId(project.getId()).actorName("System").eventType("PROJECT_CREATED").entityType("Project").entityId(project.getId()).safeMetadata("{\"title\":\"E-commerce Website Development\"}").createdAt(Instant.parse("2025-08-12T09:00:00Z")).build());
        auditRepo.save(AuditEvent.builder().projectId(project.getId()).actorName("AI").eventType("CONTRACT_DRAFT_GENERATED").entityType("ContractVersion").entityId(contract.getId()).safeMetadata("{\"version\":1,\"aiGenerated\":true}").createdAt(Instant.parse("2025-08-12T10:00:00Z")).build());
        auditRepo.save(AuditEvent.builder().projectId(project.getId()).actorName("client").eventType("CONTRACT_APPROVED_BY_CLIENT").entityType("ContractVersion").entityId(contract.getId()).safeMetadata("{\"role\":\"client\"}").createdAt(Instant.parse("2025-08-12T11:00:00Z")).build());
        auditRepo.save(AuditEvent.builder().projectId(project.getId()).actorName("freelancer").eventType("CONTRACT_APPROVED_BY_FREELANCER").entityType("ContractVersion").entityId(contract.getId()).safeMetadata("{\"role\":\"freelancer\"}").createdAt(Instant.parse("2025-08-12T11:30:00Z")).build());
        auditRepo.save(AuditEvent.builder().projectId(project.getId()).actorName("System").eventType("CONTRACT_AGREED").entityType("ContractVersion").entityId(contract.getId()).safeMetadata("{}").createdAt(Instant.parse("2025-08-12T11:30:01Z")).build());
        auditRepo.save(AuditEvent.builder().projectId(project.getId()).actorName("System").eventType("PAYPAL_ORDER_CREATED").entityType("Payment").entityId("demo-payment-design").safeMetadata("{\"orderId\":\"DEMO_ORDER_001\"}").createdAt(Instant.parse("2025-08-22T17:00:00Z")).build());
        auditRepo.save(AuditEvent.builder().projectId(project.getId()).actorName("System").eventType("PAYMENT_CAPTURED").entityType("Payment").entityId("demo-payment-design").safeMetadata("{\"captureId\":\"DEMO_CAPTURE_001\",\"amount\":250}").createdAt(Instant.parse("2025-08-22T17:30:00Z")).build());
        auditRepo.save(AuditEvent.builder().projectId(project.getId()).actorName("client").eventType("MILESTONE_ACCEPTED").entityType("Milestone").entityId(m1.getId()).safeMetadata("{}").createdAt(Instant.parse("2025-08-22T16:00:00Z")).build());
        auditRepo.save(AuditEvent.builder().projectId(project.getId()).actorName("freelancer").eventType("MILESTONE_EVIDENCE_SUBMITTED").entityType("Submission").entityId("demo-submission-frontend").safeMetadata("{\"milestoneId\":\"demo-milestone-frontend\"}").createdAt(Instant.parse("2025-08-25T09:18:00Z")).build());

        log.info("Demo data seeded successfully. Project ID: {}", project.getId());
    }
}
