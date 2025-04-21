package com.fileshare.controller;

import com.fileshare.dto.FileDTO;
import com.fileshare.dto.FileUploadDTO;
import com.fileshare.model.File;
import com.fileshare.service.FileStorageService;
import com.fileshare.service.SecurityService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileController {

    private final FileStorageService fileStorageService;
    private final SecurityService securityService;

    @PostMapping("/upload")
    public ResponseEntity<?> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "expiryMinutes", defaultValue = "0") int expiryMinutes,
            HttpSession session) {
        
        String userId = (String) session.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Not authenticated"));
        }
        
        try {
            FileDTO uploadedFile = fileStorageService.storeFile(file, userId, expiryMinutes);
            
            return ResponseEntity.ok(FileUploadDTO.builder()
                    .connectionCode(uploadedFile.getConnectionCode())
                    .expiryMinutes(expiryMinutes > 0 ? expiryMinutes : 10) // Default 10 minutes
                    .build());
        } catch (IOException e) {
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to upload file: " + e.getMessage()));
        }
    }

    @PostMapping("/verify")
    public ResponseEntity<?> verifyConnectionCode(
            @RequestParam("code") String code,
            HttpSession session,
            HttpServletRequest request) {
        
        // Get client IP for rate limiting
        String clientIp = request.getRemoteAddr();
        
        // Check if IP is temporarily blocked due to too many failed attempts
        if (securityService.isIpBlocked(clientIp)) {
            long remainingSeconds = securityService.getRemainingTimeoutSeconds(clientIp);
            return ResponseEntity
                    .status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of(
                            "message", "Too many failed attempts. Please try again later.",
                            "timeoutSeconds", remainingSeconds
                    ));
        }
        
        // Get user ID from session
        String userId = (String) session.getAttribute("userId");
        
        // Verify the code
        return fileStorageService.getFileByConnectionCode(code, userId)
                .map(fileDTO -> {
                    // Generate download URL
                    String downloadUrl = fileStorageService.generateDownloadUrl(fileDTO.getId());
                    
                    // Reset failed attempts for this IP since verification was successful
                    securityService.resetFailedAttempts(clientIp);
                    
                    return ResponseEntity.ok(Map.of(
                            "fileId", fileDTO.getId(),
                            "fileName", fileDTO.getFileName(),
                            "fileSize", fileDTO.getSize(),
                            "downloadUrl", downloadUrl
                    ));
                })
                .orElseGet(() -> {
                    // Record failed attempt
                    securityService.recordFailedAttempt(clientIp);
                    
                    return ResponseEntity
                            .status(HttpStatus.NOT_FOUND)
                            .body(Map.of("message", "Invalid or expired connection code"));
                });
    }

    @GetMapping("/download/{token}")
    public ResponseEntity<?> downloadFile(@PathVariable String token, HttpSession session) {
        String userId = (String) session.getAttribute("userId");
        
        if (userId == null) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Not authenticated"));
        }
        
        return fileStorageService.getFileByDownloadToken(token)
                .map(file -> {
                    try {
                        // Convert stored file path to a URL
                        Path filePath = Paths.get(file.getPath());
                        Resource resource = new UrlResource(filePath.toUri());
                        
                        if (resource.exists()) {
                            // Set content disposition and file name
                            return ResponseEntity.ok()
                                    .contentType(MediaType.parseMediaType(file.getContentType()))
                                    .header(HttpHeaders.CONTENT_DISPOSITION, 
                                            "attachment; filename=\"" + file.getFileName() + "\"")
                                    .body(resource);
                        } else {
                            return ResponseEntity
                                    .status(HttpStatus.NOT_FOUND)
                                    .body(Map.of("message", "File not found"));
                        }
                    } catch (MalformedURLException e) {
                        return ResponseEntity
                                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                                .body(Map.of("message", "Error retrieving file"));
                    }
                })
                .orElseGet(() -> ResponseEntity
                        .status(HttpStatus.NOT_FOUND)
                        .body(Map.of("message", "Invalid or expired download link")));
    }

    @PostMapping("/downloaded")
    public ResponseEntity<?> markFileAsDownloaded(
            @RequestParam("fileId") Long fileId, 
            HttpSession session) {
        
        String userId = (String) session.getAttribute("userId");
        
        if (userId == null) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Not authenticated"));
        }
        
        try {
            fileStorageService.markAsDownloaded(fileId, userId);
            return ResponseEntity.ok(Map.of("message", "File marked as downloaded"));
        } catch (Exception e) {
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to update file status: " + e.getMessage()));
        }
    }
}