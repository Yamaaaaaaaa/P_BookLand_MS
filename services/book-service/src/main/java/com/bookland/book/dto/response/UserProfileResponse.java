package com.bookland.book.dto.response;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileResponse {
    private String id;
    private String userId;
    private String username;
    private String email;
    private String firstName;
    private String lastName;
}
