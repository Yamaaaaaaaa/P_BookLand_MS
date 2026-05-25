package com.bookland.identity.config;

import java.util.HashSet;

import com.bookland.identity.constant.PredefinedRole;
import com.bookland.identity.entity.Role;
import com.bookland.identity.entity.User;
import com.bookland.identity.repository.RoleRepository;
import com.bookland.identity.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import lombok.extern.slf4j.Slf4j;

@Configuration
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class ApplicationInitConfig {

    @Autowired
    PasswordEncoder passwordEncoder;

    @Autowired
    com.bookland.identity.repository.httpclient.ProfileClient profileClient;

    @NonFinal
    static final String ADMIN_USER_NAME = "admin";

    @NonFinal
    static final String ADMIN_PASSWORD = "admin";

    @Bean
    ApplicationRunner applicationRunner(UserRepository userRepository, RoleRepository roleRepository) {
        log.info("Initializing application.....");
        return args -> {
            if (userRepository.findByUsername(ADMIN_USER_NAME).isEmpty()) {
                System.out.println("CẦN TAO ADMIN");
                roleRepository.save(Role.builder()
                        .name(PredefinedRole.USER_ROLE)
                        .description("User role - Khách hàng")
                        .build());

                Role adminRole = roleRepository.save(Role.builder()
                        .name(PredefinedRole.ADMIN_ROLE)
                        .description("Admin role - Quản trị toàn bộ hệ thống")
                        .build());
 
                // Tạo 3 role mới: MANAGER, ORDER_STAFF, SERVICE_SUPPORTER
                 Role managerRole =roleRepository.save(Role.builder()
                        .name(PredefinedRole.MANAGER_ROLE)
                        .description("Manager role - Quản lý toàn bộ hệ thống")
                        .build());

                Role orderStaffRole =roleRepository.save(Role.builder()
                        .name(PredefinedRole.ORDER_STAFF_ROLE)
                        .description("Order Staff role - Nhân viên xử lý đơn hàng")
                        .build());

                Role serviceSupporterRole =roleRepository.save(Role.builder()
                        .name(PredefinedRole.SERVICE_SUPPORTER_ROLE)
                        .description("Service Supporter role - Nhân viên hỗ trợ khách hàng")
                        .build());

                Role adminLoginRole =roleRepository.save(Role.builder()
                        .name(PredefinedRole.ADMIN_LOGIN_ROLE)
                        .description("Admin Login role - Nhân viên hỗ trợ khách hàng")
                        .build());

                var roles = new HashSet<Role>();
                roles.add(adminRole);
                roles.add(adminLoginRole);
                User user = User.builder()
                        .username(ADMIN_USER_NAME)
                        .email(ADMIN_USER_NAME + "@gmail.com")
                        .password(passwordEncoder.encode(ADMIN_PASSWORD))
                        .roles(roles)
                        .build();

                userRepository.save(user);
                log.warn("admin user has been created with default password: admin, please change it");
            }

            // Check & update admin user UUID in user-service
            try {
                java.util.Optional<User> adminUserOpt = userRepository.findByUsername(ADMIN_USER_NAME);
                if (adminUserOpt.isPresent()) {
                    User adminUser = adminUserOpt.get();
                    try {
                        com.bookland.identity.dto.request.ApiResponse<com.bookland.identity.dto.response.UserProfileResponse> profileResponse = 
                                profileClient.getProfileByEmail(adminUser.getEmail());
                        if (profileResponse != null && profileResponse.getResult() != null) {
                            com.bookland.identity.dto.response.UserProfileResponse profile = profileResponse.getResult();
                            if (!adminUser.getId().equals(profile.getUserId())) {
                                log.info("Admin userId in user-service ({}) does not match identity-service UUID ({}). Updating...",
                                        profile.getUserId(), adminUser.getId());
                                profileClient.updateUserIdByEmail(adminUser.getEmail(), adminUser.getId());
                                log.info("Successfully updated admin userId in user-service.");
                            } else {
                                log.info("Admin userId in user-service matches identity-service UUID.");
                            }
                        }
                    } catch (feign.FeignException.NotFound nf) {
                        log.info("Admin profile not found in user-service. Seeding a new profile...");
                        profileClient.createProfile(com.bookland.identity.dto.request.ProfileCreationRequest.builder()
                                .userId(adminUser.getId())
                                .username(adminUser.getUsername())
                                .email(adminUser.getEmail())
                                .firstName("Admin")
                                .lastName("System")
                                .build());
                        log.info("Successfully created admin profile in user-service.");
                    }
                }
            } catch (Exception e) {
                log.error("Failed to check/update admin user profile in user-service: {}", e.getMessage());
            }

            log.info("Application initialization completed .....");
        };
    }

}