package com.fileshare.service;

import com.fileshare.dto.FileDTO;
import com.fileshare.dto.UserDTO;
import com.fileshare.model.File;
import com.fileshare.model.User;
import com.fileshare.repository.FileRepository;
import com.fileshare.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FileStorageService {

    private final FileRepository fileRepository;
    private final UserRepository userRepository;
    private final CodeGenerationService codeGenerationService;
    
    @Value("${file.upload.directory}")
    private String uploadDir;
    
    @Value("${file.connection-code.expiry-minutes}")
    private int defaultExpiryMinutes;
    
    public FileDTO storeFile(MultipartFile file, String userId, int expiryMinutes) throws IOException {
        // Create upload directory if it doesn't exist
        Path uploadPath = Paths.get(uploadDir);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }
        
        // Generate unique filename
        String originalFilename = file.getOriginalFilename();
        String storedFilename = UUID.randomUUID().toString() + 
                                "_" + 
                                (originalFilename != null ? originalFilename : "unnamed");
        
        // Copy file to storage location
        Path targetPath = uploadPath.resolve(storedFilename);
        Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
        
        // Generate unique connection code
        String connectionCode = codeGenerationService.generateUniqueCode();
        
        // Set expiry time
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(expiryMinutes > 0 ? expiryMinutes : defaultExpiryMinutes);
        
        // Get user
        User uploader = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        // Create file record
        File fileEntity = File.builder()
                .fileName(originalFilename != null ? originalFilename : "unnamed")
                .contentType(file.getContentType())
                .path(targetPath.toString())
                .size(file.getSize())
                .connectionCode(connectionCode)
                .status("WAITING_FOR_DOWNLOAD")
                .expiresAt(expiresAt)
                .uploader(uploader)
                .build();
        
        File savedFile = fileRepository.save(fileEntity);
        return mapToDTO(savedFile);
    }
    
    public Optional<FileDTO> getFileByConnectionCode(String code, String userId) {
        return fileRepository.findByConnectionCode(code)
                .filter(file -> {
                    // Check if file is not expired
                    boolean notExpired = file.getExpiresAt().isAfter(LocalDateTime.now());
                    
                    // Check if file is not already downloaded
                    boolean notDownloaded = "WAITING_FOR_DOWNLOAD".equals(file.getStatus());
                    
                    // Check if user is not the uploader (security measure)
                    boolean notUploader = !file.getUploader().getId().equals(userId);
                    
                    return notExpired && notDownloaded && notUploader;
                })
                .map(this::mapToDTO);
    }
    
    public Optional<FileDTO> getFileById(Long id) {
        return fileRepository.findById(id)
                .map(this::mapToDTO);
    }
    
    public String generateDownloadUrl(Long fileId) {
        File file = fileRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found"));
        
        // Generate token for the download URL
        String token = UUID.randomUUID().toString();
        
        // Set expiry time for download URL (3 minutes)
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(3);
        
        // Update file with download URL and expiry
        file.setDownloadUrl(token);
        file.setDownloadExpiresAt(expiresAt);
        fileRepository.save(file);
        
        // Construct and return download URL
        return ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/api/files/download/")
                .path(token)
                .toUriString();
    }
    
    public void markAsDownloaded(Long fileId, String userId) {
        File file = fileRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found"));
        
        file.setStatus("DOWNLOADED");
        file.setDownloadedBy(userId);
        fileRepository.save(file);
    }
    
    public Optional<File> getFileByDownloadToken(String token) {
        return fileRepository.findAll().stream()
                .filter(file -> 
                    token.equals(file.getDownloadUrl()) && 
                    file.getDownloadExpiresAt() != null && 
                    file.getDownloadExpiresAt().isAfter(LocalDateTime.now())
                )
                .findFirst();
    }
    
    private FileDTO mapToDTO(File file) {
        return FileDTO.builder()
                .id(file.getId())
                .fileName(file.getFileName())
                .contentType(file.getContentType())
                .size(file.getSize())
                .connectionCode(file.getConnectionCode())
                .status(file.getStatus())
                .downloadUrl(file.getDownloadUrl())
                .downloadExpiresAt(file.getDownloadExpiresAt())
                .expiresAt(file.getExpiresAt())
                .uploader(mapUserToDTO(file.getUploader()))
                .createdAt(file.getCreatedAt())
                .build();
    }
    
    private UserDTO mapUserToDTO(User user) {
        return UserDTO.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .picture(user.getPicture())
                .build();
    }
}