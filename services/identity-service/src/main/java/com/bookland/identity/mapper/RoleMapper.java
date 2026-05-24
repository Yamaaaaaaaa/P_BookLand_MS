package com.bookland.identity.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.bookland.identity.dto.request.RoleRequest;
import com.bookland.identity.dto.response.RoleResponse;
import com.bookland.identity.entity.Role;

@Mapper(componentModel = "spring")
public interface RoleMapper {
    @Mapping(target = "permissions", ignore = true)
    Role toRole(RoleRequest request);

    RoleResponse toRoleResponse(Role role);
}
