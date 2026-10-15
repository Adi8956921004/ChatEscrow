package com.chatescrow.backend.repository;
import com.chatescrow.backend.model.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
public interface PaymentRepository extends JpaRepository<Payment, String> {
    Optional<Payment> findByProviderOrderId(String orderId);
    List<Payment> findByProjectId(String projectId);
    List<Payment> findByMilestoneId(String milestoneId);
}
