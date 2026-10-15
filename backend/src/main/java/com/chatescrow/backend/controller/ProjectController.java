package com.chatescrow.backend.controller;

import com.chatescrow.backend.model.*;
import com.chatescrow.backend.service.*;
import lombok.RequiredArgsConstructor;
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
    public ResponseEntity<Project> createProject(@RequestBody Map<String, Object> body) {
        String title = (String) body.get("title");
        String description = (String) body.get("description");
        String clientName = (String) body.getOrDefault("clientName", "Client");
        String freelancerName = (String) body.getOrDefault("freelancerName", "Freelancer");
        BigDecimal budget = body.get("totalBudget") != null
                ? new BigDecimal(body.get("totalBudget").toString()) : null;
        String currency = (String) body.getOrDefault("currency", "USD");
        Project p = projectService.createProject(title, description, clientName, freelancerName, budget, currency);
        return ResponseEntity.ok(p);
    }

    // --- Contract versions ---
    @GetMapping("/projects/{projectId}/contract-versions")
    public List<ContractVersion> getContractVersions(@PathVariable String projectId) {
        return contractService.getContractVersions(projectId);
    }

    @PostMapping("/projects/{projectId}/contract-drafts")
    public ResponseEntity<ContractVersion> generateDraft(@PathVariable String projectId,
                                                          @RequestBody Map<String, String> body) {
        String conversation = body.get("conversationText");
        if (conversation == null || conversation.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(contractService.generateDraftFromConversation(projectId, conversation));
    }

    @PutMapping("/projects/{projectId}/contract-drafts/{draftId}")
    public ResponseEntity<ContractVersion> saveDraft(@PathVariable String projectId,
                                                      @PathVariable String draftId,
                                                      @RequestBody Map<String, String> body) {
        String termsJson = body.get("termsJson");
        return ResponseEntity.ok(contractService.saveDraft(projectId, termsJson));
    }

    @PostMapping("/projects/{projectId}/contract-versions/{versionId}/approve")
    public ResponseEntity<ContractVersion> approveContract(@PathVariable String projectId,
                                                            @PathVariable String versionId,
                                                            @RequestBody Map<String, String> body) {
        String role = body.get("role"); // "client" or "freelancer"
        return ResponseEntity.ok(contractService.approveVersion(versionId, role));
    }

    // --- Milestones ---
    @GetMapping("/projects/{projectId}/milestones")
    public List<Milestone> getMilestones(@PathVariable String projectId) {
        return projectService.getMilestones(projectId);
    }

    @PostMapping("/projects/{projectId}/milestones")
    public ResponseEntity<Milestone> createMilestone(@PathVariable String projectId,
                                                      @RequestBody Map<String, Object> body) {
        String title = (String) body.get("title");
        BigDecimal amount = body.get("amount") != null
                ? new BigDecimal(body.get("amount").toString()) : null;
        String dueDate = (String) body.get("dueDate");
        String deliverables = (String) body.get("deliverables");
        String criteria = (String) body.get("acceptanceCriteria");
        String description = (String) body.get("description");
        String contractVersionId = (String) body.get("contractVersionId");
        return ResponseEntity.ok(projectService.createMilestone(
                projectId, title, amount, dueDate, deliverables, criteria, description, contractVersionId));
    }

    // --- Timeline ---
    @GetMapping("/projects/{projectId}/timeline")
    public List<AuditEvent> getTimeline(@PathVariable String projectId) {
        return projectService.getTimeline(projectId);
    }

    // --- Payments ---
    @PostMapping("/payments/paypal/orders")
    public ResponseEntity<Map<String, Object>> createOrder(@RequestBody Map<String, Object> body) {
        String projectId = (String) body.get("projectId");
        String milestoneId = (String) body.get("milestoneId");
        BigDecimal amount = new BigDecimal(body.get("amount").toString());
        String currency = (String) body.getOrDefault("currency", "USD");
        return ResponseEntity.ok(paymentService.createOrder(projectId, milestoneId, amount, currency));
    }

    @PostMapping("/payments/paypal/orders/{orderId}/capture")
    public ResponseEntity<Map<String, Object>> captureOrder(@PathVariable String orderId) {
        try {
            return ResponseEntity.ok(paymentService.captureOrder(orderId));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of(
                "status", "ERROR",
                "orderId", orderId,
                "message", e.getMessage() != null ? e.getMessage() : "Capture failed",
                "sandbox", true
            ));
        }
    }

    @PostMapping("/payments/demo-deposit")
    public ResponseEntity<Payment> demoDeposit(@RequestBody Map<String, Object> body) {
        String projectId = (String) body.get("projectId");
        String milestoneId = (String) body.get("milestoneId");
        BigDecimal amount = new BigDecimal(body.get("amount").toString());
        String currency = (String) body.getOrDefault("currency", "USD");
        return ResponseEntity.ok(paymentService.recordDemoPayment(projectId, milestoneId, amount, currency));
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
            "sandbox", true,
            "note", "This is a hackathon prototype. No real funds are held or transferred."
        );
    }
}
