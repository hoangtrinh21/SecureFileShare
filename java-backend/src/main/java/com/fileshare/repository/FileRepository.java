package com.fileshare.repository;

import com.fileshare.model.File;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface FileRepository extends JpaRepository<File, Long> {
    Optional<File> findByConnectionCode(String connectionCode);
    
    @Query("SELECT COUNT(f) FROM File f WHERE f.status = 'WAITING_FOR_DOWNLOAD' AND f.expiresAt > ?1")
    long countActiveFiles(LocalDateTime now);
}