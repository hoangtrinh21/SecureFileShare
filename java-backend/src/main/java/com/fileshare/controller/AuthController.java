package com.fileshare.controller;

import com.fileshare.dto.GoogleTokenVerificationDTO;
import com.fileshare.dto.UserDTO;
import com.fileshare.security.GoogleTokenVerifier;
import com.fileshare.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpSession;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final GoogleTokenVerifier googleTokenVerifier;
    private final UserService userService;

    @PostMapping("/google")
    public ResponseEntity<?> authenticateWithGoogle(
            @RequestBody GoogleTokenVerificationDTO request,
            HttpSession session) {
        try {
            UserDTO user = googleTokenVerifier.verifyGoogleToken(request.getCredential());
            
            // Store user in session
            session.setAttribute("userId", user.getId());
            
            return ResponseEntity.ok(user);
        } catch (Exception e) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Authentication failed: " + e.getMessage()));
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(HttpSession session) {
        String userId = (String) session.getAttribute("userId");
        
        if (userId != null) {
            return userService.findById(userId)
                    .map(ResponseEntity::ok)
                    .orElseGet(() -> ResponseEntity
                            .status(HttpStatus.UNAUTHORIZED)
                            .body(Map.of("message", "User not found")));
        }
        
        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("message", "Not authenticated"));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpSession session) {
        session.invalidate();
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }
}