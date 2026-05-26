import axiosClient from './axiosClient';
import type { ApiResponse, Page } from '../types/api';
import type { Role, RoleRequest, RoleQueryParams } from '../types/Role';

const roleService = {
    getAllRoles: (params?: RoleQueryParams) => {
        return axiosClient.get<any, ApiResponse<Page<Role>>>('/api/roles', { params });
    },
    getRoleById: (id: number) => {
        return axiosClient.get<any, ApiResponse<Role>>(`/api/roles/${id}`);
    },
    createRole: (data: RoleRequest) => {
        return axiosClient.post<any, ApiResponse<Role>>('/api/roles', data);
    },
    updateRole: (id: number, data: RoleRequest) => {
        return axiosClient.put<any, ApiResponse<Role>>(`/api/roles/${id}`, data);
    },
    deleteRole: (id: number) => {
        return axiosClient.delete<any, ApiResponse<void>>(`/api/roles/${id}`);
    }
};

export default roleService;
