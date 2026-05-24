package com.bookland.user.dto.response;

import com.bookland.user.entity.User;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Set;
import java.util.stream.Collectors;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserResponse {

    private Long id;
    private String username;
    private String firstName;
    private String lastName;
    private LocalDate dob;
    private String email;
    private String phone;
    private User.UserStatus status;
    private LocalDateTime createdAt;
    private Set<RoleResponse> roles;

    public static UserResponse fromEntity(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .dob(user.getDob())
                .email(user.getEmail())
                .phone(user.getPhone())
                .status(user.getStatus())
                .createdAt(user.getCreatedAt())
                .roles(user.getRoles().stream()
                        .map(RoleResponse::fromEntity)
                        .collect(Collectors.toSet()))
                .build();
    }
}
