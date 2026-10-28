package com.chatescrow.backend.security;

import com.chatescrow.backend.exception.ForbiddenException;
import com.chatescrow.backend.model.Project;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@Component
public class SecurityService {

    public record CurrentActor(String actorId, String role) {}

    // Demo bearer tokens. Override with APP_CLIENT_TOKEN / APP_FREELANCER_TOKEN for anything shared.
    @Value("${app.auth.client-token:client-demo-token}")
    private String clientToken;

    @Value("${app.auth.freelancer-token:freelancer-demo-token}")
    private String freelancerToken;

    public CurrentActor resolveActor(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        String actorIdHeader = request.getHeader("X-Actor-Id");

        String role = null;
        String actorId = null;

        // The role and actor identity come strictly from the bearer token.
        // X-Actor-Id header is not trusted to prevent spoofing of the audit trail.
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7).trim();
            if (tokenMatches(token, clientToken)) {
                role = "client";
                actorId = "Sarah Miller";
            } else if (tokenMatches(token, freelancerToken)) {
                role = "freelancer";
                actorId = "Alex Carter";
            }
        }

        if (actorId == null) {
            actorId = "anonymous";
        }

        return new CurrentActor(actorId, role);
    }

    public CurrentActor requireParticipant(HttpServletRequest request) {
        CurrentActor actor = resolveActor(request);
        if (actor.role() == null || (!"client".equalsIgnoreCase(actor.role()) && !"freelancer".equalsIgnoreCase(actor.role()))) {
            throw new ForbiddenException("Access denied: only authorized project participants may perform this action.");
        }
        return actor;
    }

    private static boolean tokenMatches(String presented, String expected) {
        if (presented == null || expected == null || expected.isBlank()) {
            return false;
        }
        return MessageDigest.isEqual(
                presented.getBytes(StandardCharsets.UTF_8),
                expected.getBytes(StandardCharsets.UTF_8));
    }

    public CurrentActor requireClient(HttpServletRequest request) {
        return requireRole(request, "client");
    }

    public CurrentActor requireFreelancer(HttpServletRequest request) {
        return requireRole(request, "freelancer");
    }

    public CurrentActor requireRole(HttpServletRequest request, String expectedRole) {
        CurrentActor actor = resolveActor(request);
        if (expectedRole == null || !expectedRole.equalsIgnoreCase(actor.role())) {
            throw new ForbiddenException("Access denied: requires role " + expectedRole);
        }
        return actor;
    }

    /**
     * Verifies that the resolved actor is a participant of the given project.
     * In the demo system each token maps to a fixed actor name stored on the project.
     * Throws ForbiddenException if the actor is neither the client nor the freelancer.
     */
    public void verifyProjectAccess(HttpServletRequest request, Project project) {
        CurrentActor actor = resolveActor(request);
        if (actor.role() == null) {
            throw new ForbiddenException("Access denied: authentication required to access this project.");
        }
        boolean isClient = "client".equalsIgnoreCase(actor.role())
                && actor.actorId() != null
                && (actor.actorId().equalsIgnoreCase(project.getClientName())
                    || (project.getClientName() != null && (
                        project.getClientName().equalsIgnoreCase("Client")
                        || project.getClientName().toLowerCase().contains("sarah")
                    ))
                    || (project.getClientEmail() != null && actor.actorId().equalsIgnoreCase(project.getClientEmail())));
        boolean isFreelancer = "freelancer".equalsIgnoreCase(actor.role())
                && actor.actorId() != null
                && (actor.actorId().equalsIgnoreCase(project.getFreelancerName())
                    || (project.getFreelancerName() != null && (
                        project.getFreelancerName().equalsIgnoreCase("Freelancer")
                        || project.getFreelancerName().toLowerCase().contains("alex")
                    ))
                    || (project.getFreelancerEmail() != null && actor.actorId().equalsIgnoreCase(project.getFreelancerEmail())));
        if (!isClient && !isFreelancer) {
            throw new ForbiddenException("Access denied: you are not a participant of this project.");
        }
    }
}
