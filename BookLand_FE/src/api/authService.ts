import axiosClient from './axiosClient';
import type { ApiResponse } from '../types/api';
import type { AuthenticationResponse, LoginRequest, LoginResponse, RefreshRequest, LogoutRequest, RegisterRequest } from '../types/Auth';

const authService = {
    login: (data: LoginRequest) => {
        return axiosClient.post<any, ApiResponse<LoginResponse>>('/auth/login', data);
    },
    adminLogin: (data: LoginRequest) => {
        return axiosClient.post<any, ApiResponse<LoginResponse>>('/auth/admin/login', data);
    },
    register: (data: RegisterRequest) => {
        return axiosClient.post<any, ApiResponse<void>>('/auth/register', data);
    },
    logout: (data: LogoutRequest) => {
        return axiosClient.post<any, ApiResponse<void>>('/auth/logout', data);
    },
    refresh: (data: RefreshRequest) => {
        return axiosClient.post<any, ApiResponse<AuthenticationResponse>>('/auth/refresh', data);
    },
    introspect: (token: string) => {
        return axiosClient.post<any, ApiResponse<{ valid: boolean }>>('/auth/introspect', { token, tokenType: 'Bearer' });
    },
    loginWithGoogle: (idToken: string) => {
        return axiosClient.post<any, ApiResponse<LoginResponse>>('/auth/google', { idToken });
    },
};

export default authService;

