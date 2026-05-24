package com.bookland.user.config;

import java.util.HashSet;

import com.bookland.user.constant.PredefinedRole;
import com.bookland.user.entity.Role;
import com.bookland.user.entity.User;
import com.bookland.user.repository.RoleRepository;
import com.bookland.user.repository.UserRepository;
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

// Tác dụng: Tạo sẵn các DB mặc đinh, tránh dữ liệu trống phải đi import tay
// Gồm: 1 User mặc định admin-admin, quyền ADMIN, các role mặc định: ADMIN, USER, MANAGER, ORDER_STAFF, SERVICE_SUPPORTER, ADMIN_LOGIN

@Configuration
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class ApplicationInitConfig {

    @Autowired
    PasswordEncoder passwordEncoder;

    @NonFinal
    static final String ADMIN_USER_NAME = "admin";

    @NonFinal
    static final String ADMIN_PASSWORD = "admin";

    @Bean
    @ConditionalOnProperty(
            prefix = "spring",
            name = "datasource.driver-class-name",
            havingValue = "com.mysql.cj.jdbc.Driver")
    ApplicationRunner applicationRunner(UserRepository userRepository, RoleRepository roleRepository) {
        log.info("Initializing application.....");
        return args -> {
            if (userRepository.findByUsername(ADMIN_USER_NAME).isEmpty()) {
                log.info("Creating default roles and admin user...");
                
                roleRepository.save(Role.builder()
                        .name(PredefinedRole.USER_ROLE)
                        .description("User role - Khách hàng")
                        .build());

                Role adminRole = roleRepository.save(Role.builder()
                        .name(PredefinedRole.ADMIN_ROLE)
                        .description("Admin role - Quản trị toàn bộ hệ thống")
                        .build());
 
                // Tạo các role bổ sung: MANAGER, ORDER_STAFF, SERVICE_SUPPORTER, ADMIN_LOGIN
                roleRepository.save(Role.builder()
                        .name(PredefinedRole.MANAGER_ROLE)
                        .description("Manager role - Quản lý toàn bộ hệ thống")
                        .build());

                roleRepository.save(Role.builder()
                        .name(PredefinedRole.ORDER_STAFF_ROLE)
                        .description("Order Staff role - Nhân viên xử lý đơn hàng")
                        .build());

                roleRepository.save(Role.builder()
                        .name(PredefinedRole.SERVICE_SUPPORTER_ROLE)
                        .description("Service Supporter role - Nhân viên hỗ trợ khách hàng")
                        .build());

                Role adminLoginRole = roleRepository.save(Role.builder()
                        .name(PredefinedRole.ADMIN_LOGIN_ROLE)
                        .description("Admin Login role - Quyền đăng nhập quản trị")
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
                log.warn("admin user has been created with default password: 'admin', please change it!");
            }
            log.info("Application initialization completed .....");
        };
    }
}
