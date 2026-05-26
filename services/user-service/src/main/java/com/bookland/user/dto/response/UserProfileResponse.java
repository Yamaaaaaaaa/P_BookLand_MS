package com.bookland.user.dto.response;

import java.time.LocalDate;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserProfileResponse {
    Long id;      // identity-service PK, unified user ID
    String username;
    String email;
    String firstName;
    String lastName;
    LocalDate dob;
    String phone;
    String city;
}
