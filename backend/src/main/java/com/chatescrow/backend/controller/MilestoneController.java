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

    @PostMapping("/milestones/{milestoneId}/accept")
    public ResponseEntity<Milestone> acceptMilestone(@PathVariable String milestoneId,
                                                      @RequestBody Map<String, String> body) {
        String actor = body.getOrDefault("actorId", "client");
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

    @PostMapping("/milestones/{milestoneId}/release")
    public ResponseEntity<Map<String, Object>> releaseMilestone(@PathVariable String milestoneId,
                                                                @RequestBody(required = false) Map<String, String> body) {
        String actor = body != null ? body.getOrDefault("actorId", "client") : "client";
        String recipientEmail = body != null ? body.get("recipientEmail") : null;
        return ResponseEntity.ok(milestoneService.releaseMilestone(milestoneId, actor, recipientEmail));
    }

    @GetMapping("/milestones/{milestoneId}/dispute-pack")
    public ResponseEntity<Map<String, Object>> getDisputePack(@PathVariable String milestoneId) {
        return ResponseEntity.ok(milestoneService.getDisputePack(milestoneId));
    }
}
