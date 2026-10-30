package com.chatescrow.backend.controller;

import com.chatescrow.backend.model.*;
import com.chatescrow.backend.security.SecurityService;
import com.chatescrow.backend.service.MilestoneService;
import com.chatescrow.backend.service.ProjectService;
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
    private final ProjectService projectService;

    public record SubmitEvidenceRequest(
            String description,
            String evidenceLinks,
            String fileReferences
    ) {}

    public record RequestRevisionRequest(
            String note
    ) {}

    public record FlagDisagreementRequest(
            String reason
    ) {}

    private Project getProjectForMilestone(String milestoneId) {
        Milestone m = milestoneService.getMilestone(milestoneId);
        return projectService.getProject(m.getProjectId());
    }

    @GetMapping("/milestones/{milestoneId}")
    public Milestone getMilestone(@PathVariable String milestoneId, HttpServletRequest request) {
        securityService.requireParticipant(request);
        securityService.verifyProjectAccess(request, getProjectForMilestone(milestoneId));
        return milestoneService.getMilestone(milestoneId);
    }

    /**
     * Freelancer submits evidence. Only authorized freelancers may submit work evidence.
     */
    @PostMapping("/milestones/{milestoneId}/submissions")
    public ResponseEntity<Submission> submitEvidence(@PathVariable String milestoneId,
                                                      @RequestBody(required = false) SubmitEvidenceRequest body,
                                                      HttpServletRequest request) {
        SecurityService.CurrentActor actor = securityService.requireFreelancer(request);
        securityService.verifyProjectAccess(request, getProjectForMilestone(milestoneId));
        String description = body != null ? body.description() : null;
        String evidenceLinks = body != null ? body.evidenceLinks() : null;
        String fileRefs = body != null ? body.fileReferences() : null;
        return ResponseEntity.ok(milestoneService.submitEvidence(
                milestoneId, actor.actorId(), description, evidenceLinks, fileRefs));
    }

    @GetMapping("/milestones/{milestoneId}/submissions")
    public List<Submission> getSubmissions(@PathVariable String milestoneId, HttpServletRequest request) {
        securityService.requireParticipant(request);
        securityService.verifyProjectAccess(request, getProjectForMilestone(milestoneId));
        return milestoneService.getSubmissions(milestoneId);
    }

    @PostMapping("/submissions/{submissionId}/evaluate")
    public ResponseEntity<AcceptanceReport> evaluateSubmission(@PathVariable String submissionId,
                                                              HttpServletRequest request) {
        securityService.requireParticipant(request);
        Submission sub = milestoneService.getSubmission(submissionId);
        securityService.verifyProjectAccess(request, getProjectForMilestone(sub.getMilestoneId()));
        return ResponseEntity.ok(milestoneService.evaluateSubmission(submissionId));
    }

    @GetMapping("/submissions/{submissionId}/reports")
    public List<AcceptanceReport> getReports(@PathVariable String submissionId, HttpServletRequest request) {
        securityService.requireParticipant(request);
        Submission sub = milestoneService.getSubmission(submissionId);
        securityService.verifyProjectAccess(request, getProjectForMilestone(sub.getMilestoneId()));
        return milestoneService.getReports(submissionId);
    }

    /**
     * Accept a milestone. Only the client role may call this endpoint.
     */
    @PostMapping("/milestones/{milestoneId}/accept")
    public ResponseEntity<?> acceptMilestone(@PathVariable String milestoneId,
                                              HttpServletRequest request) {
        SecurityService.CurrentActor actor = securityService.requireClient(request);
        securityService.verifyProjectAccess(request, getProjectForMilestone(milestoneId));
        return ResponseEntity.ok(milestoneService.acceptMilestone(milestoneId, actor.actorId()));
    }

    /**
     * Request a revision. Only the client role may request revisions.
     */
    @PostMapping("/milestones/{milestoneId}/request-revision")
    public ResponseEntity<Milestone> requestRevision(@PathVariable String milestoneId,
                                                      @RequestBody(required = false) RequestRevisionRequest body,
                                                      HttpServletRequest request) {
        SecurityService.CurrentActor actor = securityService.requireClient(request);
        securityService.verifyProjectAccess(request, getProjectForMilestone(milestoneId));
        String note = body != null ? body.note() : null;
        return ResponseEntity.ok(milestoneService.requestRevision(milestoneId, actor.actorId(), note));
    }

    /**
     * Flag disagreement. Only the client role may flag disagreements.
     */
    @PostMapping("/milestones/{milestoneId}/flag-disagreement")
    public ResponseEntity<Milestone> flagDisagreement(@PathVariable String milestoneId,
                                                       @RequestBody(required = false) FlagDisagreementRequest body,
                                                       HttpServletRequest request) {
        SecurityService.CurrentActor actor = securityService.requireClient(request);
        securityService.verifyProjectAccess(request, getProjectForMilestone(milestoneId));
        String reason = body != null ? body.reason() : null;
        return ResponseEntity.ok(milestoneService.flagDisagreement(milestoneId, actor.actorId(), reason));
    }

    /**
     * Release milestone payout. Only the client role may authorize a release.
     * Recipient is strictly derived from the stored project freelancer record.
     */
    @PostMapping("/milestones/{milestoneId}/release")
    public ResponseEntity<?> releaseMilestone(@PathVariable String milestoneId,
                                              HttpServletRequest request) {
        SecurityService.CurrentActor actor = securityService.requireClient(request);
        securityService.verifyProjectAccess(request, getProjectForMilestone(milestoneId));
        return ResponseEntity.ok(milestoneService.releaseMilestone(milestoneId, actor.actorId()));
    }

    @GetMapping("/milestones/{milestoneId}/dispute-pack")
    public ResponseEntity<Map<String, Object>> getDisputePack(@PathVariable String milestoneId,
                                                              HttpServletRequest request) {
        securityService.requireParticipant(request);
        securityService.verifyProjectAccess(request, getProjectForMilestone(milestoneId));
        return ResponseEntity.ok(milestoneService.getDisputePack(milestoneId));
    }
}
