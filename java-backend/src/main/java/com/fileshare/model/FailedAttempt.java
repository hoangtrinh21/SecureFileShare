package com.fileshare.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "failed_attempts")
public class FailedAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String ip;

    @Column(nullable = false)
    private Integer attempts;

    @Column(nullable = false)
    private LocalDateTime lastAttemptAt;

    @Column
    private LocalDateTime timeoutUntil;

    @Column
    private Integer timeoutDuration;
}