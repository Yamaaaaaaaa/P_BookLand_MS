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

    /**
     * Được gọi từ identity-service sau khi đăng ký thành công.
     * userId trong request chính là Long id từ identity-service.
     */
    @Transactional
    public UserProfileResponse createProfile(ProfileCreationRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new AppException(ErrorCode.USER_EXISTED);
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new AppException(ErrorCode.EMAIL_EXISTED);
        }

        // userId từ identity-service chính là Long id, ta lưu làm PK luôn
        User user = User.builder()
                .id(request.getUserId())  // identity-service Long id → user-service Long id
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

    /**
     * Lấy profile theo Long id (identity-service PK).
     */
    @Transactional(readOnly = true)
    public UserProfileResponse getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
        return mapToResponse(user);
    }

    @Transactional(readOnly = true)
    public List<UserProfileResponse> getAllProfiles() {
        return userRepository.findAll().stream()
                .map(this::mapToResponse)
                .toList();
    }

    /**
     * Lấy profile của chính mình qua email (từ header X-User-Email).
     */
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

    /**
     * Cập nhật profile của chính mình qua email.
     */
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

    /**
     * Cập nhật profile theo Long userId (internal, dùng bởi identity-service nếu cần).
     */
    @Transactional
    public UserProfileResponse updateProfileById(Long userId, UpdateProfileRequest request) {
        User user = userRepository.findById(userId)
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

    private UserProfileResponse mapToResponse(User user) {
        return UserProfileResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .dob(user.getDob())
                .phone(user.getPhone())
                .build();
    }
}
