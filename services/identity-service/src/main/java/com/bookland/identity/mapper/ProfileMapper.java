package com.bookland.identity.mapper;

import org.mapstruct.Mapper;

import com.bookland.identity.dto.request.ProfileCreationRequest;
import com.bookland.identity.dto.request.UserCreationRequest;

@Mapper(componentModel = "spring")
public interface ProfileMapper {
    ProfileCreationRequest toProfileCreationRequest(UserCreationRequest request);
}
