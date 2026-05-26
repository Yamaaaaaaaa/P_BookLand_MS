package com.bookland.order.dto.response;

import lombok.*;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileResponse {
    private Long id;       // identity-service PK, unified user ID
    private String username;
    private String email;
    private String firstName;
    private String lastName;
    private LocalDate dob;
    private String phone;
    private String city;
}
