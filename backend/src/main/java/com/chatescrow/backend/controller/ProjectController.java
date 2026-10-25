package com.chatescrow.backend.controller;

import com.chatescrow.backend.model.*;
import com.chatescrow.backend.security.SecurityService;
import com.chatescrow.backend.service.*;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;
    private final ContractService contractService;
    private final PaymentService paymentService;
    private final SecurityService securityService;

    public record CreateProjectRequest(
            String title,
            String description,
            String clientName,
            String clientEmail,
            String freelancerName,
            String freelancerEmail,
            BigDecimal totalBudget,
            String currency
    ) {}

    public record CreateMilestoneRequest(
            String title,
            BigDecimal amount,
            String dueDate,
            String deliverables,
            String acceptanceCriteria,
            String description,
            String contractVersionId
    ) {}

    public record CreateOrderRequest(
            String projectId,
            String milestoneId,
            String currency
    ) {}

    public record DemoDepositRequest(
            String projectId,
            String milestoneId
    ) {}

    // --- Projects ---
    @GetMapping("/projects")
    public List<Project> listProjects() {
        return projectService.getAllProjects();
    }

    @GetMapping("/projects/{projectId}")
    public Project getProject(@PathVariable String projectId) {
        return projectService.getProject(projectId);
    }

    @PostMapping("/projects")
    public ResponseEntity<Project> createProject(@RequestBody CreateProjectRequest body) {
        String clientName = body.clientName() != null ? body.clientName() : "Client";
        String freelancerName = body.freelancerName() != null ? body.freelancerName() : "Freelancer";
        String currency = body.currency() != null ? body.currency() : "USD";
        Project p = projectService.createProject(
                body.title(),
                body.description(),
                clientName,
                body.clientEmail(),
                freelancerName,
                body.freelancerEmail(),
                body.totalBudget(),
                currency);
        return ResponseEntity.ok(p);
    }

    // --- Contract versions ---
    @GetMapping("/projects/{projectId}/contract-versions")
    public List<ContractVersion> getContractVersions(@PathVariable String projectId) {
        return contractService.getContractVersions(projectId);
    }

    @PostMapping("/projects/{projectId}/contract-drafts")
    public ResponseEntity<ContractVersion> generateDraft(@PathVariable String projectId,
                                                          @RequestBody Map<String, String> body,
                                                          HttpServletRequest request) {
        securityService.requireParticipant(request);
        String conversation = body != null ? body.get("conversationText") : null;
        if (conversation == null || conversation.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(contractService.generateDraftFromConversation(projectId, conversation));
    }

    @PutMapping("/projects/{projectId}/contract-drafts/{draftId}")
    public ResponseEntity<ContractVersion> saveDraft(@PathVariable String projectId,
                                                      @PathVariable String draftId,
                                                      @RequestBody Map<String, String> body,
                                                      HttpServletRequest request) {
        securityService.requireParticipant(request);
        String termsJson = body != null ? body.get("termsJson") : null;
        return ResponseEntity.ok(contractService.saveDraft(projectId, draftId, termsJson));
    }

    /**
     * Approves contract version. Server validates caller role to prevent one party approving for another.
     */
    @PostMapping("/projects/{projectId}/contract-versions/{versionId}/approve")
    public ResponseEntity<ContractVersion> approveContract(@PathVariable String projectId,
                                                            @PathVariable String versionId,
                                                            @RequestBody Map<String, String> body,
                                                            HttpServletRequest request) {
        String role = body.get("role"); // "client" or "freelancer"
        if (role == null || role.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        securityService.requireRole(request, role);
        return ResponseEntity.ok(contractService.approveVersion(versionId, role));
    }

    // --- Milestones ---
    @GetMapping("/projects/{projectId}/milestones")
    public List<Milestone> getMilestones(@PathVariable String projectId) {
        return projectService.getMilestones(projectId);
    }

    /**
     * Creates a milestone. Only the client role may add milestones to a project.
     */
    @PostMapping("/projects/{projectId}/milestones")
    public ResponseEntity<Milestone> createMilestone(@PathVariable String projectId,
                                                      @RequestBody CreateMilestoneRequest body,
                                                      HttpServletRequest request) {
        securityService.requireClient(request);
        return ResponseEntity.ok(projectService.createMilestone(
                projectId, body.title(), body.amount(), body.dueDate(),
                body.deliverables(), body.acceptanceCriteria(), body.description(), body.contractVersionId()));
    }

    // --- Timeline ---
    @GetMapping("/projects/{projectId}/timeline")
    public List<AuditEvent> getTimeline(@PathVariable String projectId) {
        return projectService.getTimeline(projectId);
    }

    // --- Payments ---
    /**
     * Creates PayPal order. Amount is looked up server-side from milestone to prevent client tampering.
     */
    @PostMapping("/payments/paypal/orders")
    public ResponseEntity<Map<String, Object>> createOrder(@RequestBody CreateOrderRequest body) {
        String currency = body.currency() != null ? body.currency() : "USD";
        return ResponseEntity.ok(paymentService.createOrder(body.projectId(), body.milestoneId(), currency));
    }

    /**
     * Captures PayPal order. Returns 200 on CAPTURED, 409 on UNKNOWN (indeterminate / mismatch),
     * or 422 on a definitive failure.
     */
    @PostMapping("/payments/paypal/orders/{orderId}/capture")
    public ResponseEntity<Map<String, Object>> captureOrder(@PathVariable String orderId) {
        Map<String, Object> result = paymentService.captureOrder(orderId);
        String status = (String) result.get("status");
        if ("CAPTURED".equalsIgnoreCase(status)) {
            return ResponseEntity.ok(result);
        } else if ("FAILED".equalsIgnoreCase(status)) {
            return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(result);
        } else if ("UNKNOWN".equalsIgnoreCase(status)) {
            // Payment outcome is indeterminate (timeout or amount mismatch).
            // 409 Conflict: the request was valid but the outcome cannot be confirmed.
            return ResponseEntity.status(HttpStatus.CONFLICT).body(result);
        } else {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(result);
        }
    }

    /**
     * Re-checks an UNKNOWN payment by calling GET /v2/checkout/orders/{id} on PayPal.
     * Use after a timeout or amount-mismatch to confirm whether money was actually taken.
     */
    @PostMapping("/payments/paypal/orders/{orderId}/recheck")
    public ResponseEntity<Map<String, Object>> recheckPayment(@PathVariable String orderId) {
        Map<String, Object> result = paymentService.recheckPayment(orderId);
        String status = (String) result.get("status");
        if ("CAPTURED".equalsIgnoreCase(status)) {
            return ResponseEntity.ok(result);
        } else if ("UNKNOWN".equalsIgnoreCase(status)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(result);
        } else {
            return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(result);
        }
    }

    /**
     * Records a simulated demo payment. Only clients may fund milestones.
     * The funding amount and currency are strictly retrieved from the stored milestone
     * to prevent client tampering.
     */
    @PostMapping("/payments/demo-deposit")
    public ResponseEntity<Payment> demoDeposit(@RequestBody DemoDepositRequest body,
                                               HttpServletRequest request) {
        securityService.requireClient(request);
        return ResponseEntity.ok(paymentService.recordDemoPayment(body.projectId(), body.milestoneId()));
    }

    /**
     * Refunds payment record. Only client role may request payment refund.
     */
    @PostMapping("/payments/{paymentId}/refund")
    public ResponseEntity<Payment> refundPayment(@PathVariable String paymentId,
                                                @RequestBody(required = false) Map<String, String> body,
                                                HttpServletRequest request) {
        securityService.requireClient(request);
        String reason = body != null ? body.get("reason") : "Refund requested";
        return ResponseEntity.ok(paymentService.refundPayment(paymentId, reason));
    }

    @GetMapping("/projects/{projectId}/payments")
    public List<Payment> getProjectPayments(@PathVariable String projectId) {
        return paymentService.getProjectPayments(projectId);
    }

    // --- Status / health ---
    @GetMapping("/status")
    public Map<String, Object> getStatus() {
        return Map.of(
            "service", "chatescrow-backend",
            "status", "UP",
            "paypalConfigured", paymentService.isPaypalConfigured(),
            "sandbox", paymentService.isSandbox(),
            "note", "ChatEscrow Prototype. Milestone payment workflow ledger."
        );
    }
}
