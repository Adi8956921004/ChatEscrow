package com.chatescrow.backend.security;

import com.chatescrow.backend.exception.ForbiddenException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;

@Component
public class SecurityService {

    public record CurrentActor(String actorId, String role) {}

    public CurrentActor resolveActor(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        String actorIdHeader = request.getHeader("X-Actor-Id");

        String role = null;
        String actorId = null;

        // Role is determined solely from the Bearer token — not from X-Actor-Role.
        // X-Actor-Role is accepted by CORS for frontend convenience but is not trusted for authorization.
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7).trim();
            if ("client-demo-token".equalsIgnoreCase(token)) {
                role = "client";
                actorId = "client";
            } else if ("freelancer-demo-token".equalsIgnoreCase(token)) {
                role = "freelancer";
                actorId = "freelancer";
            }
        }

        // X-Actor-Id may be used for audit/display purposes only; it does not grant a role.
        if (actorIdHeader != null && !actorIdHeader.isBlank()) {
            actorId = actorIdHeader.trim();
        } else if (actorId == null) {
            actorId = "anonymous";
        }

        return new CurrentActor(actorId, role);
    }

    public CurrentActor requireClient(HttpServletRequest request) {
        CurrentActor actor = resolveActor(request);
        if (!"client".equalsIgnoreCase(actor.role())) {
            throw new ForbiddenException("Access denied: only authorized clients may perform this action.");
        }
        return actor;
    }

    public CurrentActor requireFreelancer(HttpServletRequest request) {
        CurrentActor actor = resolveActor(request);
        if (!"freelancer".equalsIgnoreCase(actor.role())) {
            throw new ForbiddenException("Access denied: only authorized freelancers may perform this action.");
        }
        return actor;
    }

    public CurrentActor requireRole(HttpServletRequest request, String expectedRole) {
        CurrentActor actor = resolveActor(request);
        if (expectedRole == null || !expectedRole.equalsIgnoreCase(actor.role())) {
            throw new ForbiddenException("Access denied: requires role " + expectedRole);
        }
        return actor;
    }
}
