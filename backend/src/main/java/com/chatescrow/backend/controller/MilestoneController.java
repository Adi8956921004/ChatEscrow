package com.chatescrow.backend.controller;

import com.chatescrow.backend.model.*;
import com.chatescrow.backend.service.MilestoneService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class MilestoneController {

    private final MilestoneService milestoneService;

    @GetMapping("/milestones/{milestoneId}")
    public Milestone getMilestone(@PathVariable String milestoneId) {
        return milestoneService.getMilestone(milestoneId);
    }

    @PostMapping("/milestones/{milestoneId}/submissions")
    public ResponseEntity<Submission> submitEvidence(@PathVariable String milestoneId,
                                                      @RequestBody Map<String, String> body) {
        String submittedBy = body.getOrDefault("submittedBy", "freelancer");
        String description = body.get("description");
        String evidenceLinks = body.get("evidenceLinks");
        String fileRefs = body.get("fileReferences");
        return ResponseEntity.ok(milestoneService.submitEvidence(
                milestoneId, submittedBy, description, evidenceLinks, fileRefs));
    }

    @GetMapping("/milestones/{milestoneId}/submissions")
    public List<Submission> getSubmissions(@PathVariable String milestoneId) {
        return milestoneService.getSubmissions(milestoneId);
    }

    @PostMapping("/submissions/{submissionId}/evaluate")
    public ResponseEntity<AcceptanceReport> evaluateSubmission(@PathVariable String submissionId) {
        return ResponseEntity.ok(milestoneService.evaluateSubmission(submissionId));
    }

    @GetMapping("/submissions/{submissionId}/reports")
    public List<AcceptanceReport> getReports(@PathVariable String submissionId) {
        return milestoneService.getReports(submissionId);
    }

    /**
     * Accept a milestone. Only the client role may call this endpoint.
     */
    @PostMapping("/milestones/{milestoneId}/accept")
    public ResponseEntity<?> acceptMilestone(@PathVariable String milestoneId,
                                             @RequestBody Map<String, String> body) {
        String actor = body.getOrDefault("actorId", "client");
        String role  = body.getOrDefault("role", "client");
        if (!"client".equalsIgnoreCase(role)) {
            return ResponseEntity.status(403).body(Map.of("error", "Only the client may accept a milestone."));
        }
        return ResponseEntity.ok(milestoneService.acceptMilestone(milestoneId, actor));
    }

    @PostMapping("/milestones/{milestoneId}/request-revision")
    public ResponseEntity<Milestone> requestRevision(@PathVariable String milestoneId,
                                                      @RequestBody Map<String, String> body) {
        String actor = body.getOrDefault("actorId", "client");
        String note = body.get("note");
        return ResponseEntity.ok(milestoneService.requestRevision(milestoneId, actor, note));
    }

    @PostMapping("/milestones/{milestoneId}/flag-disagreement")
    public ResponseEntity<Milestone> flagDisagreement(@PathVariable String milestoneId,
                                                       @RequestBody Map<String, String> body) {
        String actor = body.getOrDefault("actorId", "client");
        String reason = body.get("reason");
        return ResponseEntity.ok(milestoneService.flagDisagreement(milestoneId, actor, reason));
    }

    /**
     * Release milestone payout. Only the client role may authorize a release.
     */
    @PostMapping("/milestones/{milestoneId}/release")
    public ResponseEntity<?> releaseMilestone(@PathVariable String milestoneId,
                                              @RequestBody(required = false) Map<String, String> body) {
        String actor = body != null ? body.getOrDefault("actorId", "client") : "client";
        String role  = body != null ? body.getOrDefault("role", "client") : "client";
        String recipientEmail = body != null ? body.get("recipientEmail") : null;
        if (!"client".equalsIgnoreCase(role)) {
            return ResponseEntity.status(403).body(Map.of("error", "Only the client may authorize a payout release."));
        }
        return ResponseEntity.ok(milestoneService.releaseMilestone(milestoneId, actor, recipientEmail));
    }

    @GetMapping("/milestones/{milestoneId}/dispute-pack")
    public ResponseEntity<Map<String, Object>> getDisputePack(@PathVariable String milestoneId) {
        return ResponseEntity.ok(milestoneService.getDisputePack(milestoneId));
    }

    // NOTE: /refund, /resolve-dispute, and /ai-mediation endpoints have been removed.
    // They were P2 scope and are not required for the hackathon demo submission.
    // Dispute resolution is handled externally via the dispute-pack export.
}
