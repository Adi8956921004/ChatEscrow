package com.chatescrow.backend.repository;
import com.chatescrow.backend.model.WebhookEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface WebhookEventRepository extends JpaRepository<WebhookEvent, String> {
    Optional<WebhookEvent> findByProviderEventId(String eventId);
}
