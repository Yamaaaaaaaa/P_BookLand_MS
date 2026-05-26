import axiosClient from './axiosClient';
import type { ApiResponse, Page } from '../types/api';
import type { User, UserRequest, UserUpdateRequest, UserStatus } from '../types/User';

interface UserQueryParams {
    keyword?: string;
    status?: UserStatus;
    roleId?: number;
    page?: number;
    size?: number;
    sortBy?: string;
    sortDirection?: string;
}

const userService = {
    getAllUsers: (params?: UserQueryParams) => {
        return axiosClient.get<any, ApiResponse<Page<User>>>('/api/users', { params });
    },
    getUserById: (id: number) => {
        return axiosClient.get<any, ApiResponse<User>>(`/api/users/${id}`);
    },
    createUser: (data: UserRequest) => {
        return axiosClient.post<any, ApiResponse<User>>('/api/users', data);
    },
    updateUser: (id: number, data: UserUpdateRequest) => {
        return axiosClient.put<any, ApiResponse<User>>(`/api/users/${id}`, data);
    },
    deleteUser: (id: number) => {
        return axiosClient.delete<any, ApiResponse<void>>(`/api/users/${id}`);
    },
    updateUserStatus: (id: number, status: UserStatus) => {
        return axiosClient.patch<any, ApiResponse<User>>(`/api/users/${id}/status`, null, { params: { status } });
    },
    updateUserRoles: (id: number, roleIds: number[]) => {
        return axiosClient.put<any, ApiResponse<User>>(`/api/users/${id}/roles`, { roleIds });
    },
    
    // Customer own profile
    getOwnProfile: () => {
        return axiosClient.get<any, ApiResponse<User>>('/api/users/me');
    },
    
    // Admin specific endpoints (mapping to /admin/users based on docs, though some seem duplicate)
    adminGetUserById: (id: number) => {
        return axiosClient.get<any, ApiResponse<User>>(`/admin/users/${id}`);
    },
    adminUpdateUser: (id: number, data: UserUpdateRequest) => {
        return axiosClient.put<any, ApiResponse<User>>(`/admin/users/${id}`, data);
    },
    adminDeleteUser: (id: number) => {
        return axiosClient.delete<any, ApiResponse<void>>(`/admin/users/${id}`); // Note: Doc says returns just OK, checking schemas usually ApiResponseVoid or implicitly handled
    },
    adminUpdateUserRoles: (id: number, roleIds: number[]) => {
        return axiosClient.put<any, ApiResponse<User>>(`/admin/users/${id}/roles`, { roleIds });
    },
    adminCreateUser: (data: UserRequest) => {
        return axiosClient.post<any, ApiResponse<User>>('/admin/users/', data);
    },
    adminUpdateUserStatus: (id: number, status: UserStatus) => {
        return axiosClient.patch<any, ApiResponse<User>>(`/admin/users/${id}/status`, null, { params: { status } });
    },
    adminSendCustomEmail: (data: {
        userIds?: number[];
        sendToAll: boolean;
        subject: string;
        title: string;
        message: string;
        details?: string;
        actionUrl?: string;
        actionText?: string;
    }) => {
        return axiosClient.post<any, ApiResponse<string>>('/admin/users/send-email', data);
    }
};

export default userService;
