package com.chatescrow.backend.repository;

import com.chatescrow.backend.model.Payout;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface PayoutRepository extends JpaRepository<Payout, String> {
    Optional<Payout> findByMilestoneId(String milestoneId);
}
