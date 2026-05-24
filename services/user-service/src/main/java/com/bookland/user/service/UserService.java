package com.bookland.user.service;

import com.bookland.user.dto.request.*;
import com.bookland.user.dto.response.UserResponse;
import com.bookland.user.entity.Role;
import com.bookland.user.entity.User;
import com.bookland.user.entity.User.UserStatus;
import com.bookland.user.exception.AppException;
import com.bookland.user.exception.ErrorCode;
import com.bookland.user.repository.RoleRepository;
import com.bookland.user.repository.UserRepository;
import com.bookland.user.repository.specification.UserSpecification;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    // ===========================
    // READ
    // ===========================

    @Transactional(readOnly = true)
    public Page<UserResponse> getAllUsers(String keyword, UserStatus status, Long roleId, Pageable pageable) {
        Specification<User> spec = UserSpecification.searchByKeyword(keyword)
                .and(UserSpecification.hasStatus(status))
                .and(UserSpecification.hasRole(roleId));

        return userRepository.findAll(spec, pageable)
                .map(UserResponse::fromEntity);
    }

    @Transactional(readOnly = true)
    public UserResponse getUserById(Long id) {
        User user = userRepository.findByIdWithRoles(id)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
        return UserResponse.fromEntity(user);
    }

    @Transactional(readOnly = true)
    public UserResponse getUserByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
        return UserResponse.fromEntity(user);
    }

    @Transactional(readOnly = true)
    public UserResponse getUserByUsername(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
        return UserResponse.fromEntity(user);
    }

    // ===========================
    // CREATE
    // ===========================

    @Transactional
    public UserResponse createUser(UserRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new AppException(ErrorCode.USER_EXISTED);
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new AppException(ErrorCode.EMAIL_EXISTED);
        }

        Set<Role> roles = new HashSet<>();
        if (request.getRoleIds() != null && !request.getRoleIds().isEmpty()) {
            roles = roleRepository.findByIdIn(request.getRoleIds());
            if (roles.size() != request.getRoleIds().size()) {
                throw new AppException(ErrorCode.SOME_ROLES_NOT_FOUND);
            }
        }

        User user = User.builder()
                .username(request.getUsername())
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .dob(request.getDob())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .phone(request.getPhone())
                .status(User.UserStatus.ENABLE)
                .roles(roles)
                .build();

        User savedUser = userRepository.save(user);
        log.info("Created new user: {}", savedUser.getUsername());
        return UserResponse.fromEntity(savedUser);
    }

    // ===========================
    // UPDATE
    // ===========================

    @Transactional
    public UserResponse updateUser(Long id, UserUpdateRequest request) {
        User user = userRepository.findById(id)
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
        log.info("Updated user id={}", id);
        return UserResponse.fromEntity(updatedUser);
    }

    @Transactional
    public UserResponse updateUserRoles(Long id, UpdateRolesRequest request) {
        User user = userRepository.findByIdWithRoles(id)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        Set<Role> newRoles = roleRepository.findByIdIn(request.getRoleIds());
        if (newRoles.size() != request.getRoleIds().size()) {
            throw new AppException(ErrorCode.SOME_ROLES_NOT_FOUND);
        }

        user.setRoles(newRoles);
        User updatedUser = userRepository.save(user);
        log.info("Updated roles for user id={}", id);
        return UserResponse.fromEntity(updatedUser);
    }

    @Transactional
    public UserResponse updateUserStatus(Long id, User.UserStatus status) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        user.setStatus(status);
        User updatedUser = userRepository.save(user);
        log.info("Updated status for user id={} to {}", id, status);
        return UserResponse.fromEntity(updatedUser);
    }

    // ===========================
    // DELETE
    // ===========================

    @Transactional
    public void deleteUser(Long id) {
        if (!userRepository.existsById(id)) {
            throw new AppException(ErrorCode.USER_NOT_EXISTED);
        }
        userRepository.deleteById(id);
        log.info("Deleted user id={}", id);
    }

    // ===========================
    // INTERNAL (called by other services via Feign or internal API)
    // ===========================

    /**
     * Kiểm tra user có tồn tại theo email không — dùng cho identity-service.
     */
    @Transactional(readOnly = true)
    public boolean existsByEmail(String email) {
        return userRepository.existsByEmail(email);
    }

    /**
     * Kiểm tra user có tồn tại theo username không — dùng cho identity-service.
     */
    @Transactional(readOnly = true)
    public boolean existsByUsername(String username) {
        return userRepository.existsByUsername(username);
    }
}
