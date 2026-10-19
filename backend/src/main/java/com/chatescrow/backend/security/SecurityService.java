package com.chatescrow.backend.security;

import com.chatescrow.backend.exception.ForbiddenException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;

@Component
public class SecurityService {

    public record CurrentActor(String actorId, String role) {}

    public CurrentActor resolveActor(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        String roleHeader = request.getHeader("X-Actor-Role");
        String actorIdHeader = request.getHeader("X-Actor-Id");

        String role = null;
        String actorId = null;

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7).trim();
            if ("client-demo-token".equalsIgnoreCase(token) || "client".equalsIgnoreCase(token)) {
                role = "client";
                actorId = "client";
            } else if ("freelancer-demo-token".equalsIgnoreCase(token) || "freelancer".equalsIgnoreCase(token)) {
                role = "freelancer";
                actorId = "freelancer";
            }
        }

        if (role == null && roleHeader != null && !roleHeader.isBlank()) {
            String r = roleHeader.trim().toLowerCase();
            if ("client".equals(r) || "freelancer".equals(r)) {
                role = r;
            }
        }

        if (actorId == null) {
            actorId = (actorIdHeader != null && !actorIdHeader.isBlank()) ? actorIdHeader.trim() : (role != null ? role : "anonymous");
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
