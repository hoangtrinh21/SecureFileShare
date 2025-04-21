package com.fileshare.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FileDTO {
    private Long id;
    private String fileName;
    private String contentType;
    private Long size;
    private String connectionCode;
    private String status;
    private String downloadUrl;
    private LocalDateTime downloadExpiresAt;
    private LocalDateTime expiresAt;
    private UserDTO uploader;
    private LocalDateTime createdAt;
}