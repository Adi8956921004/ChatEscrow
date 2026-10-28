package com.chatescrow.backend.repository;
import com.chatescrow.backend.model.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
public interface PaymentRepository extends JpaRepository<Payment, String> {
    Optional<Payment> findByProviderOrderId(String orderId);
    Optional<Payment> findByProviderCaptureId(String captureId);
    List<Payment> findByProjectId(String projectId);
    List<Payment> findByMilestoneId(String milestoneId);

    @org.springframework.data.jpa.repository.Modifying(clearAutomatically = true, flushAutomatically = true)
    @org.springframework.data.jpa.repository.Query("UPDATE Payment p SET p.status = :newStatus, p.updatedAt = :now WHERE p.providerOrderId = :orderId AND p.status IN (:allowedStatuses)")
    int updateStatusIfIn(@org.springframework.data.repository.query.Param("orderId") String orderId,
                         @org.springframework.data.repository.query.Param("newStatus") Payment.PaymentStatus newStatus,
                         @org.springframework.data.repository.query.Param("allowedStatuses") java.util.Collection<Payment.PaymentStatus> allowedStatuses,
                         @org.springframework.data.repository.query.Param("now") java.time.Instant now);
}
