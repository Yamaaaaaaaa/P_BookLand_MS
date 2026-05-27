package com.bookland.identity.service;

import com.bookland.identity.dto.request.ProfileCreationRequest;
import com.bookland.identity.dto.request.ProfileUpdateRequest;
import com.bookland.identity.dto.request.UserCreationRequest;
import com.bookland.identity.dto.request.UserUpdateRequest;
import com.bookland.identity.dto.response.UserResponse;
import com.bookland.identity.entity.Role;
import com.bookland.identity.entity.User;
import com.bookland.identity.exception.AppException;
import com.bookland.identity.exception.ErrorCode;
import com.bookland.identity.mapper.UserMapper;
import com.bookland.identity.repository.RoleRepository;
import com.bookland.identity.repository.UserRepository;
import com.bookland.identity.repository.httpclient.ProfileClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final ProfileClient profileClient;

    @Transactional(readOnly = true)
    public Page<UserResponse> getAllUsers(String keyword, String status, String roleId, Pageable pageable) {
        Page<User> users;
        if (keyword != null && !keyword.trim().isEmpty()) {
            users = userRepository.findByUsernameContainingIgnoreCaseOrEmailContainingIgnoreCase(keyword, keyword, pageable);
        } else {
            users = userRepository.findAll(pageable);
        }
        return users.map(userMapper::toUserResponse);
    }

    @Transactional(readOnly = true)
    public UserResponse getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
        return userMapper.toUserResponse(user);
    }

    @Transactional(readOnly = true)
    public UserResponse getUserByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
        return userMapper.toUserResponse(user);
    }

    @Transactional
    public UserResponse createUser(UserCreationRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new AppException(ErrorCode.USER_EXISTED);
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new AppException(ErrorCode.EMAIL_EXISTED);
        }

        User user = userMapper.toUser(request);
        user.setPassword(passwordEncoder.encode(request.getPassword()));

        if (request.getCity() != null) {
            // map roles if present
            Role userRole = roleRepository.findByName("USER");
            user.setRoles(new HashSet<>());
            if (userRole != null) user.getRoles().add(userRole);
        }

        User savedUser = userRepository.save(user);

        // Gọi user-service để tạo profile
        ProfileCreationRequest profileRequest = ProfileCreationRequest.builder()
                .userId(savedUser.getId())
                .username(savedUser.getUsername())
                .email(savedUser.getEmail())
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .dob(request.getDob())
                .city(request.getCity())
                .build();
        try {
            profileClient.createProfile(profileRequest);
        } catch (Exception e) {
            log.error("Failed to create profile for user: " + savedUser.getUsername(), e);
        }

        return userMapper.toUserResponse(savedUser);
    }

    @Transactional
    public UserResponse updateUser(Long id, UserUpdateRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        userMapper.updateUser(user, request);
        if (request.getPassword() != null && !request.getPassword().isEmpty()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }

        if (request.getRoles() != null) {
            var roles = roleRepository.findAllById(request.getRoles());
            user.setRoles(new HashSet<>(roles));
        }

        User updatedUser = userRepository.save(user);

        // Gọi user-service để update profile
        ProfileUpdateRequest profileRequest = ProfileUpdateRequest.builder()
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .dob(request.getDob())
                .build();
        try {
            profileClient.updateProfile(updatedUser.getId(), profileRequest);
        } catch (Exception e) {
            log.error("Failed to update profile for user: " + updatedUser.getUsername(), e);
        }

        return userMapper.toUserResponse(updatedUser);
    }

    @Transactional
    public void deleteUser(Long id) {
        if (!userRepository.existsById(id)) {
            throw new AppException(ErrorCode.USER_NOT_EXISTED);
        }
        userRepository.deleteById(id);
    }
}
