package com.bookland.user.service;

import com.bookland.user.dto.request.ProfileCreationRequest;
import com.bookland.user.dto.request.UpdateProfileRequest;
import com.bookland.user.dto.response.UserProfileResponse;
import com.bookland.user.entity.User;
import com.bookland.user.exception.AppException;
import com.bookland.user.exception.ErrorCode;
import com.bookland.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;

    @Transactional
    public UserProfileResponse createProfile(ProfileCreationRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new AppException(ErrorCode.USER_EXISTED);
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new AppException(ErrorCode.EMAIL_EXISTED);
        }

        User user = User.builder()
                .userId(request.getUserId())
                .username(request.getUsername())
                .email(request.getEmail())
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .dob(request.getDob())
                .phone(request.getPhone())
                .status(User.UserStatus.ENABLE)
                .build();

        User savedUser = userRepository.save(user);
        log.info("Created profile for user: {}", savedUser.getUsername());
        return mapToResponse(savedUser);
    }

    @Transactional(readOnly = true)
    public UserProfileResponse getProfile(String id) {
        User user = userRepository.findByUserId(id)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
        return mapToResponse(user);
    }

    @Transactional(readOnly = true)
    public UserProfileResponse getByUserId(String userId) {
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
        return mapToResponse(user);
    }

    @Transactional(readOnly = true)
    public List<UserProfileResponse> getAllProfiles() {
        return userRepository.findAll().stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public UserProfileResponse getMyProfile(String userEmail) {
        if (!StringUtils.hasText(userEmail)) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }
        User user = userRepository.findByEmail(userEmail)
                .orElseGet(() -> userRepository.findByUsername(userEmail)
                        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED)));
        return mapToResponse(user);
    }

    @Transactional
    public UserProfileResponse updateMyProfile(String userEmail, UpdateProfileRequest request) {
        if (!StringUtils.hasText(userEmail)) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }
        User user = userRepository.findByEmail(userEmail)
                .orElseGet(() -> userRepository.findByUsername(userEmail)
                        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED)));

        if (request.getEmail() != null && !request.getEmail().equals(user.getEmail())) {
            if (userRepository.existsByEmail(request.getEmail())) {
                throw new AppException(ErrorCode.EMAIL_EXISTED);
            }
            user.setEmail(request.getEmail());
        }

        if (request.getFirstName() != null) user.setFirstName(request.getFirstName());
        if (request.getLastName() != null) user.setLastName(request.getLastName());
        if (request.getDob() != null) user.setDob(request.getDob());
        if (request.getPhone() != null) user.setPhone(request.getPhone());

        User updatedUser = userRepository.save(user);
        log.info("Updated profile for user: {}", updatedUser.getUsername());
        return mapToResponse(updatedUser);
    }

    @Transactional
    public UserProfileResponse updateProfileByUserId(String userId, UpdateProfileRequest request) {
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        if (request.getEmail() != null && !request.getEmail().equals(user.getEmail())) {
            if (userRepository.existsByEmail(request.getEmail())) {
                throw new AppException(ErrorCode.EMAIL_EXISTED);
            }
            user.setEmail(request.getEmail());
        }

        if (request.getFirstName() != null) user.setFirstName(request.getFirstName());
        if (request.getLastName() != null) user.setLastName(request.getLastName());
        if (request.getDob() != null) user.setDob(request.getDob());
        if (request.getPhone() != null) user.setPhone(request.getPhone());

        User updatedUser = userRepository.save(user);
        log.info("Updated profile for user ID {}: {}", userId, updatedUser.getUsername());
        return mapToResponse(updatedUser);
    }

    @Transactional
    public UserProfileResponse updateUserIdByEmail(String email, String newUserId) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
        user.setUserId(newUserId);
        User saved = userRepository.save(user);
        log.info("Updated userId for email {}: new userId is {}", email, newUserId);
        return mapToResponse(saved);
    }

    private UserProfileResponse mapToResponse(User user) {
        return UserProfileResponse.builder()
                .id(user.getId() != null ? user.getId().toString() : null)
                .userId(user.getUserId())
                .username(user.getUsername())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .dob(user.getDob())
                .phone(user.getPhone())
                .build();
    }
}
