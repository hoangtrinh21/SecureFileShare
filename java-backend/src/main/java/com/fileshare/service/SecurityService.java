package com.fileshare.service;

import com.fileshare.model.FailedAttempt;
import com.fileshare.repository.FailedAttemptRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class SecurityService {

    private final FailedAttemptRepository failedAttemptRepository;
    
    @Value("${file.failed-attempts.max}")
    private int maxFailedAttempts;
    
    @Value("${file.failed-attempts.initial-timeout-seconds}")
    private int initialTimeoutSeconds;
    
    @Value("${file.failed-attempts.timeout-multiplier}")
    private int timeoutMultiplier;
    
    public void recordFailedAttempt(String ip) {
        Optional<FailedAttempt> existingAttemptOpt = failedAttemptRepository.findByIp(ip);
        
        if (existingAttemptOpt.isPresent()) {
            FailedAttempt attempt = existingAttemptOpt.get();
            attempt.setAttempts(attempt.getAttempts() + 1);
            attempt.setLastAttemptAt(LocalDateTime.now());
            
            // If max attempts reached, set timeout
            if (attempt.getAttempts() >= maxFailedAttempts) {
                int timeoutDuration = initialTimeoutSeconds;
                
                // If already had timeouts, increase exponentially
                if (attempt.getTimeoutDuration() != null && attempt.getTimeoutDuration() > 0) {
                    timeoutDuration = attempt.getTimeoutDuration() * timeoutMultiplier;
                }
                
                attempt.setTimeoutDuration(timeoutDuration);
                attempt.setTimeoutUntil(LocalDateTime.now().plusSeconds(timeoutDuration));
            }
            
            failedAttemptRepository.save(attempt);
        } else {
            FailedAttempt newAttempt = FailedAttempt.builder()
                    .ip(ip)
                    .attempts(1)
                    .lastAttemptAt(LocalDateTime.now())
                    .build();
            failedAttemptRepository.save(newAttempt);
        }
    }
    
    public void resetFailedAttempts(String ip) {
        Optional<FailedAttempt> attemptOpt = failedAttemptRepository.findByIp(ip);
        
        if (attemptOpt.isPresent()) {
            FailedAttempt attempt = attemptOpt.get();
            attempt.setAttempts(0);
            attempt.setTimeoutUntil(null);
            attempt.setTimeoutDuration(0);
            failedAttemptRepository.save(attempt);
        }
    }
    
    public boolean isIpBlocked(String ip) {
        Optional<FailedAttempt> attemptOpt = failedAttemptRepository.findByIp(ip);
        
        if (attemptOpt.isPresent()) {
            FailedAttempt attempt = attemptOpt.get();
            
            // Check if IP is in timeout
            if (attempt.getTimeoutUntil() != null && 
                attempt.getTimeoutUntil().isAfter(LocalDateTime.now())) {
                return true;
            }
            
            // If timeout has expired, reset the count
            if (attempt.getTimeoutUntil() != null && 
                attempt.getTimeoutUntil().isBefore(LocalDateTime.now())) {
                resetFailedAttempts(ip);
            }
        }
        
        return false;
    }
    
    public long getRemainingTimeoutSeconds(String ip) {
        Optional<FailedAttempt> attemptOpt = failedAttemptRepository.findByIp(ip);
        
        if (attemptOpt.isPresent() && attemptOpt.get().getTimeoutUntil() != null) {
            LocalDateTime now = LocalDateTime.now();
            LocalDateTime timeoutUntil = attemptOpt.get().getTimeoutUntil();
            
            if (timeoutUntil.isAfter(now)) {
                return java.time.Duration.between(now, timeoutUntil).getSeconds();
            }
        }
        
        return 0;
    }
}