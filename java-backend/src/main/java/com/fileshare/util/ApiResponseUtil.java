package com.fileshare.util;

import com.fileshare.dto.ApiErrorDTO;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.HashMap;
import java.util.Map;

public class ApiResponseUtil {
    
    public static ResponseEntity<Map<String, Object>> success(String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("message", message);
        response.put("status", "success");
        return ResponseEntity.ok(response);
    }
    
    public static ResponseEntity<Map<String, Object>> success(String message, Object data) {
        Map<String, Object> response = new HashMap<>();
        response.put("message", message);
        response.put("status", "success");
        response.put("data", data);
        return ResponseEntity.ok(response);
    }
    
    public static ResponseEntity<ApiErrorDTO> error(HttpStatus status, String message, String path) {
        ApiErrorDTO error = ApiErrorDTO.builder()
                .status(status.value())
                .message(message)
                .path(path)
                .timestamp(System.currentTimeMillis())
                .build();
        
        return new ResponseEntity<>(error, status);
    }
}