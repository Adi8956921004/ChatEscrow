package com.chatescrow.backend.security;

import com.chatescrow.backend.exception.ForbiddenException;
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
}
