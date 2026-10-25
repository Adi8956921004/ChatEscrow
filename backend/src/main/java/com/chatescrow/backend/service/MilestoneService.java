package com.chatescrow.backend.service;

import com.chatescrow.backend.ai.AiService;
import com.chatescrow.backend.exception.ResourceNotFoundException;
import com.chatescrow.backend.model.*;
import com.chatescrow.backend.paypal.PayPalService;
import com.chatescrow.backend.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@Slf4j
@RequiredArgsConstructor
public class MilestoneService {

    private final MilestoneRepository milestoneRepo;
    private final SubmissionRepository submissionRepo;
    private final AcceptanceReportRepository reportRepo;
    private final PaymentRepository paymentRepo;
    private final PayoutRepository payoutRepo;
    private final AiService aiService;
    private final ProjectService projectService;
    private final PayPalService paypalService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public Milestone getMilestone(String id) {
        if (id == null || id.isBlank()) {
            throw new ResourceNotFoundException("Milestone ID is required");
        }
        return milestoneRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Milestone not found: " + id));
    }

    @Transactional
    public Submission submitEvidence(String milestoneId, String submittedBy,
                                      String description, String evidenceLinks, String fileRefs) {
        Milestone m = getMilestone(milestoneId);
        if (m.getStatus() == Milestone.MilestoneStatus.ACCEPTED) {
            throw new IllegalStateException("Cannot submit evidence for an already accepted milestone");
        }

        Submission sub = Submission.builder()
                .milestoneId(milestoneId)
                .submittedBy(submittedBy != null ? submittedBy : "freelancer")
                .description(description)
                .evidenceLinks(evidenceLinks)
                .fileReferences(fileRefs)
                .createdAt(Instant.now())
                .build();
        sub = submissionRepo.save(sub);

        m.setStatus(Milestone.MilestoneStatus.SUBMITTED);
        m.setUpdatedAt(Instant.now());
        milestoneRepo.save(m);

        ObjectNode meta = objectMapper.createObjectNode();
        meta.put("milestoneId", milestoneId);
        meta.put("submissionId", sub.getId());

        projectService.audit(m.getProjectId(), submittedBy != null ? submittedBy : "freelancer", submittedBy != null ? submittedBy : "freelancer",
                "MILESTONE_EVIDENCE_SUBMITTED", "Submission", sub.getId(), meta.toString());
        return sub;
    }

    /**
     * Triggers AI evaluation of a submission against the milestone's acceptance criteria.
     * Returns a structured acceptance report. AI is advisory - client decides.
     */
    @Transactional
    public AcceptanceReport evaluateSubmission(String submissionId) {
        Submission sub = submissionRepo.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found: " + submissionId));
        Milestone m = getMilestone(sub.getMilestoneId());

        String reportJson = aiService.evaluateSubmission(
                m.getAcceptanceCriteria(),
                sub.getDescription(),
                sub.getEvidenceLinks());

        boolean isLive = aiService.isLastCallLive();
        String modelName = isLive
                ? (aiService.getModel() + " (live)")
                : (aiService.isConfigured() ? "demo-mode (AI fallback)" : "demo-mode (AI key not configured)");

        AcceptanceReport report = AcceptanceReport.builder()
                .submissionId(submissionId)
                .criterionResultsJson(reportJson)
                .evidenceSummary("Evaluation against agreed milestone acceptance criteria")
                .overallSummary("AI Advisory Report for milestone: " + m.getTitle())
                .modelName(modelName)
                .aiGenerated(isLive)
                .createdAt(Instant.now())
                .build();
        report = reportRepo.save(report);

        ObjectNode meta = objectMapper.createObjectNode();
        meta.put("submissionId", submissionId);
        meta.put("aiGenerated", isLive);
        meta.put("model", modelName);

        projectService.audit(m.getProjectId(), "system", "AI",
                "AI_ACCEPTANCE_REPORT_GENERATED", "AcceptanceReport", report.getId(), meta.toString());
        return report;
    }

    /**
     * Client accepts the milestone. Only an authorized client action may mark it accepted.
     * AI does NOT automatically accept milestones.
     */
    @Transactional
    public Milestone acceptMilestone(String milestoneId, String actorId) {
        Milestone m = getMilestone(milestoneId);
        if (m.getStatus() != Milestone.MilestoneStatus.SUBMITTED) {
            throw new IllegalStateException("Milestone must be in SUBMITTED state to accept. Current: " + m.getStatus());
        }
        m.setStatus(Milestone.MilestoneStatus.ACCEPTED);
        m.setUpdatedAt(Instant.now());
        m = milestoneRepo.save(m);

        projectService.audit(m.getProjectId(), actorId, actorId,
                "MILESTONE_ACCEPTED", "Milestone", milestoneId, "{}");
        return m;
    }

    @Transactional
    public Milestone requestRevision(String milestoneId, String actorId, String note) {
        Milestone m = getMilestone(milestoneId);
        if (m.getStatus() != Milestone.MilestoneStatus.SUBMITTED) {
            throw new IllegalStateException("A revision can only be requested on a SUBMITTED milestone. Current: " + m.getStatus());
        }
        m.setStatus(Milestone.MilestoneStatus.REVISION_REQUESTED);
        m.setUpdatedAt(Instant.now());
        m = milestoneRepo.save(m);

        ObjectNode meta = objectMapper.createObjectNode();
        meta.put("note", note != null ? note : "");
        projectService.audit(m.getProjectId(), actorId, actorId,
                "MILESTONE_REVISION_REQUESTED", "Milestone", milestoneId, meta.toString());
        return m;
    }

    @Transactional
    public Milestone flagDisagreement(String milestoneId, String actorId, String reason) {
        Milestone m = getMilestone(milestoneId);
        if (payoutRepo.findByMilestoneId(milestoneId).isPresent()) {
            throw new IllegalStateException("This milestone has already been released and can no longer be disputed here.");
        }
        m.setStatus(Milestone.MilestoneStatus.DISAGREEMENT_FLAGGED);
        m.setUpdatedAt(Instant.now());
        m = milestoneRepo.save(m);

        ObjectNode meta = objectMapper.createObjectNode();
        meta.put("reason", reason != null ? reason : "");
        projectService.audit(m.getProjectId(), actorId, actorId,
                "MILESTONE_DISAGREEMENT_FLAGGED", "Milestone", milestoneId, meta.toString());
        return m;
    }

    public List<Submission> getSubmissions(String milestoneId) {
        getMilestone(milestoneId);
        return submissionRepo.findByMilestoneIdOrderByCreatedAtDesc(milestoneId);
    }

    public List<AcceptanceReport> getReports(String submissionId) {
        return reportRepo.findBySubmissionIdOrderByCreatedAtDesc(submissionId);
    }

    /**
     * Authorized milestone payout/release workflow.
     * Enforces required conditions:
     * 1. Milestone must be in ACCEPTED state.
     * 2. A CAPTURED payment must exist for the milestone (no release without verified funds).
     * 3. Idempotent: checks for existing payout record before initiating a new release.
     * 4. Provider distinction: a DEMO_ESCROW payment produces a DEMO_SIMULATED payout status.
     */
    @Transactional
    public Map<String, Object> releaseMilestone(String milestoneId, String actorId) {
        return releaseMilestone(milestoneId, actorId, null);
    }

    @Transactional
    public Map<String, Object> releaseMilestone(String milestoneId, String actorId, String ignoredRecipientEmail) {
        Milestone m = getMilestone(milestoneId);
        if (m.getStatus() != Milestone.MilestoneStatus.ACCEPTED) {
            throw new IllegalStateException("Milestone cannot be released unless it is in ACCEPTED status. Current: " + m.getStatus());
        }

        // Idempotency check: return existing payout if already released
        Optional<Payout> existingPayout = payoutRepo.findByMilestoneId(milestoneId);
        if (existingPayout.isPresent()) {
            Payout p = existingPayout.get();
            log.info("Milestone {} already released with payout batch {}", milestoneId, p.getPayoutBatchId());
            Map<String, Object> resp = new HashMap<>();
            resp.put("milestoneId", milestoneId);
            resp.put("amount", p.getAmount());
            resp.put("currency", p.getCurrency());
            resp.put("recipient", p.getRecipientEmail());
            resp.put("payoutBatchId", p.getPayoutBatchId());
            resp.put("payoutStatus", p.getStatus());
            resp.put("isSimulated", p.isSimulated());
            resp.put("provider", p.getProvider());
            resp.put("alreadyReleased", true);
            resp.put("message", "Milestone payout has already been released (idempotent result).");
            return resp;
        }

        // Require a captured payment before releasing funds
        List<Payment> payments = paymentRepo.findByMilestoneId(milestoneId);
        List<Payment> capturedPayments = payments.stream()
                .filter(p -> p.getStatus() == Payment.PaymentStatus.CAPTURED)
                .toList();

        if (capturedPayments.isEmpty()) {
            throw new IllegalStateException("Cannot release milestone: no captured payment found for milestone " + milestoneId + ". Fund the milestone via PayPal before releasing.");
        }

        // Check if funded via DEMO_ESCROW
        boolean isDemoEscrow = capturedPayments.stream()
                .allMatch(p -> "DEMO_ESCROW".equalsIgnoreCase(p.getProvider()));

        Project project = projectService.getProject(m.getProjectId());

        // Always use the stored freelancer email — never trust a recipient supplied in the request body.
        // The recipientEmail parameter is intentionally ignored here.
        String storedFreelancerEmail = project.getFreelancerEmail();
        boolean hasEmail = storedFreelancerEmail != null && !storedFreelancerEmail.isBlank();
        if (!hasEmail && !isDemoEscrow && paypalService.isConfigured()) {
            // Never invent a recipient address when real money may move.
            throw new IllegalStateException("Cannot release: the project has no freelancer email on record.");
        }
        String effectiveRecipient = hasEmail
                ? storedFreelancerEmail
                : project.getFreelancerName().toLowerCase().replace(" ", "") + "@example.com";

        BigDecimal releaseAmount = m.getAmount() != null ? m.getAmount() : BigDecimal.ZERO;
        String releaseCurrency = m.getCurrency() != null ? m.getCurrency() : "USD";
        String idempotencyKey = "payout-" + milestoneId;

        PayPalService.PayoutResult payoutResult;
        String effectiveProvider;

        if (isDemoEscrow) {
            // Simulated payment produces transparent simulated release
            payoutResult = new PayPalService.PayoutResult(
                    "sim-demo-" + milestoneId.substring(0, Math.min(milestoneId.length(), 8)),
                    "DEMO_SIMULATED",
                    true,
                    "Simulated release: Payment was funded via Simulated Milestone Deposit (DEMO_ESCROW)."
            );
            effectiveProvider = "DEMO_ESCROW";
        } else {
            payoutResult = paypalService.createPayout(
                    milestoneId,
                    effectiveRecipient,
                    releaseAmount,
                    releaseCurrency,
                    "Milestone release for: " + m.getTitle(),
                    idempotencyKey
            );
            effectiveProvider = payoutResult.isSimulated() ? "PAYPAL_SIMULATED" : "PAYPAL";
        }

        // Persist Payout entity for unique constraint and idempotency
        Payout payout = Payout.builder()
                .milestoneId(milestoneId)
                .projectId(m.getProjectId())
                .recipientEmail(effectiveRecipient)
                .amount(releaseAmount)
                .currency(releaseCurrency)
                .payoutBatchId(payoutResult.batchId())
                .idempotencyKey(idempotencyKey)
                .status(payoutResult.status())
                .simulated(payoutResult.isSimulated())
                .provider(effectiveProvider)
                .releasedAt(Instant.now())
                .build();
        payoutRepo.save(payout);

        try {
            ObjectNode meta = objectMapper.createObjectNode();
            meta.put("batchId", payoutResult.batchId());
            meta.put("status", payoutResult.status());
            meta.put("isSimulated", payoutResult.isSimulated());
            meta.put("provider", effectiveProvider);
            meta.put("idempotencyKey", idempotencyKey);
            projectService.audit(m.getProjectId(), actorId, actorId,
                    "MILESTONE_PAYOUT_RELEASED", "Milestone", milestoneId, meta.toString());
        } catch (Exception e) {
            log.warn("Failed to write audit JSON for milestone release", e);
        }

        Map<String, Object> resp = new HashMap<>();
        resp.put("milestoneId", milestoneId);
        resp.put("amount", releaseAmount);
        resp.put("currency", releaseCurrency);
        resp.put("recipient", effectiveRecipient);
        resp.put("payoutBatchId", payoutResult.batchId());
        resp.put("payoutStatus", payoutResult.status());
        resp.put("isSimulated", payoutResult.isSimulated());
        resp.put("provider", effectiveProvider);
        resp.put("alreadyReleased", false);
        resp.put("message", payoutResult.message());
        return resp;
    }

    /**
     * Organizes project agreement terms, contract versions, milestones, evidence,
     * AI acceptance reports, and audit logs into a unified dispute/evidence pack.
     */
    public Map<String, Object> getDisputePack(String milestoneId) {
        Milestone m = getMilestone(milestoneId);
        Project project = projectService.getProject(m.getProjectId());
        List<Submission> submissions = getSubmissions(milestoneId);
        List<AuditEvent> timeline = projectService.getTimeline(m.getProjectId());
        List<Payment> payments = paymentRepo.findByMilestoneId(milestoneId);

        Map<String, Object> pack = new HashMap<>();
        pack.put("project", project);
        pack.put("milestone", m);
        pack.put("submissions", submissions);
        pack.put("payments", payments);
        pack.put("auditTimeline", timeline);
        pack.put("generatedAt", Instant.now().toString());
        pack.put("disclaimer", "ChatEscrow Evidence Package: Assembled for transparency and human dispute resolution. Not legal advice.");
        return pack;
    }
}
