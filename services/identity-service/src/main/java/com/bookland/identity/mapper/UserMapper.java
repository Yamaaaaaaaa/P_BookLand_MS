package com.bookland.identity.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import com.bookland.identity.dto.request.UserCreationRequest;
import com.bookland.identity.dto.request.UserUpdateRequest;
import com.bookland.identity.dto.response.UserResponse;
import com.bookland.identity.entity.User;

@Mapper(componentModel = "spring")
public interface UserMapper {
    User toUser(UserCreationRequest request);

    UserResponse toUserResponse(User user);

    @Mapping(target = "roles", ignore = true)
    void updateUser(@MappingTarget User user, UserUpdateRequest request);
}
