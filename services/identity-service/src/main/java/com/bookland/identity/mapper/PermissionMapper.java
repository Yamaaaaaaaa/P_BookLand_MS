package com.bookland.identity.mapper;

import org.mapstruct.Mapper;

import com.bookland.identity.dto.request.PermissionRequest;
import com.bookland.identity.dto.response.PermissionResponse;
import com.bookland.identity.entity.Permission;

@Mapper(componentModel = "spring")
public interface PermissionMapper {
    Permission toPermission(PermissionRequest request);

    PermissionResponse toPermissionResponse(Permission permission);
}
