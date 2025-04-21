package com.fileshare.security;

import com.fileshare.dto.UserDTO;
import com.fileshare.service.UserService;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken.Payload;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.Collections;

@Component
@RequiredArgsConstructor
public class GoogleTokenVerifier {

    private final UserService userService;

    @Value("${spring.security.oauth2.client.registration.google.client-id}")
    private String clientId;

    public UserDTO verifyGoogleToken(String token) throws Exception {
        GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                new NetHttpTransport(), new GsonFactory())
                .setAudience(Collections.singletonList(clientId))
                .build();

        try {
            GoogleIdToken idToken = verifier.verify(token);
            if (idToken != null) {
                Payload payload = idToken.getPayload();

                String userId = payload.getSubject();
                String email = payload.getEmail();
                String name = (String) payload.get("name");
                String pictureUrl = (String) payload.get("picture");

                // Create or update user in database
                return userService.createIfNotExists(userId, name, email, pictureUrl);
            } else {
                throw new RuntimeException("Invalid ID token");
            }
        } catch (GeneralSecurityException | IOException e) {
            throw new RuntimeException("Error verifying Google token", e);
        }
    }
}