package com.bookland.identity.repository.httpclient;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;

import com.bookland.identity.config.AuthenticationRequestInterceptor;
import com.bookland.identity.dto.request.ApiResponse;
import com.bookland.identity.dto.request.ProfileCreationRequest;
import com.bookland.identity.dto.request.ProfileUpdateRequest;
import com.bookland.identity.dto.response.UserProfileResponse;

@FeignClient(
        name = "user-service",
        url = "${app.services.user}",
        configuration = {AuthenticationRequestInterceptor.class})
public interface ProfileClient {

    @PostMapping(value = "/internal/users", produces = MediaType.APPLICATION_JSON_VALUE)
    ApiResponse<UserProfileResponse> createProfile(@RequestBody ProfileCreationRequest request);

    @PutMapping(value = "/internal/users/{userId}", produces = MediaType.APPLICATION_JSON_VALUE)
    ApiResponse<UserProfileResponse> updateProfile(@PathVariable("userId") Long userId, @RequestBody ProfileUpdateRequest request);

    @org.springframework.web.bind.annotation.GetMapping(value = "/users/my-profile", produces = MediaType.APPLICATION_JSON_VALUE)
    ApiResponse<UserProfileResponse> getProfileByEmail(@RequestHeader("X-User-Email") String email);
}
