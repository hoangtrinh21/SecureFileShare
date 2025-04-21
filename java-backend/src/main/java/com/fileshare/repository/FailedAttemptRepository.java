package com.fileshare.repository;

import com.fileshare.model.FailedAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface FailedAttemptRepository extends JpaRepository<FailedAttempt, Long> {
    Optional<FailedAttempt> findByIp(String ip);
}