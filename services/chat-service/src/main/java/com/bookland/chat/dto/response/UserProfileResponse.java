package com.bookland.chat.dto.response;

import java.time.LocalDate;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserProfileResponse {
    Long id;
    String username;
    String email;
    String firstName;
    String lastName;
    LocalDate dob;
    String phone;
    String city;
}
