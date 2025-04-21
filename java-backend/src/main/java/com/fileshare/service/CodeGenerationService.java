package com.fileshare.service;

import com.fileshare.repository.FileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class CodeGenerationService {

    private final FileRepository fileRepository;
    private final SecureRandom random = new SecureRandom();
    
    @Value("${file.connection-code.length.min}")
    private int minCodeLength;
    
    @Value("${file.connection-code.length.max}")
    private int maxCodeLength;
    
    @Value("${file.connection-code.usage-threshold}")
    private double usageThreshold;
    
    private static final String CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    
    public String generateUniqueCode() {
        int codeLength = calculateCodeLength();
        String code;
        do {
            code = generateRandomCode(codeLength);
        } while (codeExists(code));
        
        return code;
    }
    
    private int calculateCodeLength() {
        long activeFileCount = fileRepository.countActiveFiles(LocalDateTime.now());
        
        // Start with minimum length
        int length = minCodeLength;
        
        // Calculate the total possible codes for the current length
        long possibleCodes = (long) Math.pow(CHARACTERS.length(), length);
        
        // If usage would exceed threshold, increase length
        while ((double) activeFileCount / possibleCodes > usageThreshold && length < maxCodeLength) {
            length++;
            possibleCodes = (long) Math.pow(CHARACTERS.length(), length);
        }
        
        return length;
    }
    
    private String generateRandomCode(int length) {
        StringBuilder code = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            code.append(CHARACTERS.charAt(random.nextInt(CHARACTERS.length())));
        }
        return code.toString();
    }
    
    private boolean codeExists(String code) {
        return fileRepository.findByConnectionCode(code).isPresent();
    }
}