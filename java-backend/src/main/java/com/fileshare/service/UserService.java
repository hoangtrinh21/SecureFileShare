package com.fileshare.service;

import com.fileshare.dto.UserDTO;
import com.fileshare.model.User;
import com.fileshare.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    
    public UserDTO createIfNotExists(String id, String name, String email, String picture) {
        Optional<User> existingUser = userRepository.findById(id);
        
        if (existingUser.isPresent()) {
            return mapToDTO(existingUser.get());
        }
        
        User newUser = User.builder()
                .id(id)
                .name(name)
                .email(email)
                .picture(picture)
                .createdAt(LocalDateTime.now())
                .build();
                
        User savedUser = userRepository.save(newUser);
        return mapToDTO(savedUser);
    }
    
    public Optional<UserDTO> findByEmail(String email) {
        return userRepository.findByEmail(email)
                .map(this::mapToDTO);
    }
    
    public Optional<UserDTO> findById(String id) {
        return userRepository.findById(id)
                .map(this::mapToDTO);
    }
    
    private UserDTO mapToDTO(User user) {
        return UserDTO.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .picture(user.getPicture())
                .build();
    }
}