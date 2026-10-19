package com.chatescrow.backend.controller;

import com.chatescrow.backend.model.*;
import com.chatescrow.backend.security.SecurityService;
import com.chatescrow.backend.service.MilestoneService;
import jakarta.servlet.http.HttpServletRequest;
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
    private final SecurityService securityService;

    @GetMapping("/milestones/{milestoneId}")
    public Milestone getMilestone(@PathVariable String milestoneId) {
        return milestoneService.getMilestone(milestoneId);
    }

    /**
     * Freelancer submits evidence. Only authorized freelancers may submit work evidence.
     */
    @PostMapping("/milestones/{milestoneId}/submissions")
    public ResponseEntity<Submission> submitEvidence(@PathVariable String milestoneId,
                                                      @RequestBody Map<String, String> body,
                                                      HttpServletRequest request) {
        SecurityService.CurrentActor actor = securityService.requireFreelancer(request);
        String description = body.get("description");
        String evidenceLinks = body.get("evidenceLinks");
        String fileRefs = body.get("fileReferences");
        return ResponseEntity.ok(milestoneService.submitEvidence(
                milestoneId, actor.actorId(), description, evidenceLinks, fileRefs));
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
                                              HttpServletRequest request) {
        SecurityService.CurrentActor actor = securityService.requireClient(request);
        return ResponseEntity.ok(milestoneService.acceptMilestone(milestoneId, actor.actorId()));
    }

    /**
     * Request a revision. Only the client role may request revisions.
     */
    @PostMapping("/milestones/{milestoneId}/request-revision")
    public ResponseEntity<Milestone> requestRevision(@PathVariable String milestoneId,
                                                      @RequestBody Map<String, String> body,
                                                      HttpServletRequest request) {
        SecurityService.CurrentActor actor = securityService.requireClient(request);
        String note = body != null ? body.get("note") : null;
        return ResponseEntity.ok(milestoneService.requestRevision(milestoneId, actor.actorId(), note));
    }

    /**
     * Flag disagreement. Only the client role may flag disagreements.
     */
    @PostMapping("/milestones/{milestoneId}/flag-disagreement")
    public ResponseEntity<Milestone> flagDisagreement(@PathVariable String milestoneId,
                                                       @RequestBody Map<String, String> body,
                                                       HttpServletRequest request) {
        SecurityService.CurrentActor actor = securityService.requireClient(request);
        String reason = body != null ? body.get("reason") : null;
        return ResponseEntity.ok(milestoneService.flagDisagreement(milestoneId, actor.actorId(), reason));
    }

    /**
     * Release milestone payout. Only the client role may authorize a release.
     */
    @PostMapping("/milestones/{milestoneId}/release")
    public ResponseEntity<?> releaseMilestone(@PathVariable String milestoneId,
                                              @RequestBody(required = false) Map<String, String> body,
                                              HttpServletRequest request) {
        SecurityService.CurrentActor actor = securityService.requireClient(request);
        String recipientEmail = body != null ? body.get("recipientEmail") : null;
        return ResponseEntity.ok(milestoneService.releaseMilestone(milestoneId, actor.actorId(), recipientEmail));
    }

    @GetMapping("/milestones/{milestoneId}/dispute-pack")
    public ResponseEntity<Map<String, Object>> getDisputePack(@PathVariable String milestoneId) {
        return ResponseEntity.ok(milestoneService.getDisputePack(milestoneId));
    }
}
