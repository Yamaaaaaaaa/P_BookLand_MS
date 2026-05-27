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
        return axiosClient.get<any, ApiResponse<User>>('/users/my-profile');
    },
    updateOwnProfile: (data: UserUpdateRequest) => {
        return axiosClient.put<any, ApiResponse<User>>('/users/my-profile', data);
    },
    
    // Admin specific endpoints (mapping to /admin/users based on docs, though some seem duplicate)
    adminGetUserById: async (id: number) => {
        const [identityRes, profileRes] = await Promise.all([
            axiosClient.get<any, ApiResponse<any>>(`/api/users/${id}`).catch(() => ({ result: null })),
            axiosClient.get<any, ApiResponse<any>>(`/users/${id}`).catch(() => ({ result: null }))
        ]);

        const identityData = identityRes?.result || {};
        const profileData = profileRes?.result || {};

        return {
            result: {
                ...identityData,
                ...profileData,
                id: id
            }
        };
    },
    adminUpdateUser: (id: number, data: any) => {
        const payload = {
            ...data,
            roles: data.roleIds
        };
        return axiosClient.put<any, ApiResponse<User>>(`/api/users/${id}`, payload);
    },
    adminDeleteUser: (id: number) => {
        return axiosClient.delete<any, ApiResponse<void>>(`/api/users/${id}`);
    },
    adminUpdateUserRoles: (id: number, roleIds: any[]) => {
        return axiosClient.put<any, ApiResponse<User>>(`/api/users/${id}`, { roles: roleIds });
    },
    adminCreateUser: async (data: any) => {
        const response = await axiosClient.post<any, ApiResponse<User>>('/api/users', data);
        if (response.result?.id && data.roleIds && data.roleIds.length > 0) {
            try {
                await axiosClient.put<any, ApiResponse<User>>(`/api/users/${response.result.id}`, {
                    roles: data.roleIds
                });
            } catch (roleError) {
                console.error("Failed to assign roles for new user", roleError);
            }
        }
        return response;
    },
    adminUpdateUserStatus: (id: number, status: UserStatus) => {
        return Promise.resolve({ result: { id, status } } as any);
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
        return axiosClient.post<any, ApiResponse<string>>('/api/notifications/email/send-custom', data);
    }
};

export default userService;
