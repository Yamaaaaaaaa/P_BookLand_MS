import axiosClient from './axiosClient';
import type { Notification } from '../types/Notification';

export interface ApiResponse<T> {
    code: number;
    message: string;
    result: T;
}

export interface PageResponse<T> {
    totalElements: number;
    totalPages: number;
    numberOfElements: number;
    size: number;
    content: T[];
    number: number;
    empty: boolean;
    first: boolean;
    last: boolean;
}

const notificationService = {
    getNotifications: async (userId: number, page: number = 0, size: number = 10) => {
        const response = await axiosClient.get<ApiResponse<PageResponse<Notification>>>(
            `/notifications/user/${userId}`,
            { params: { page, size } }
        );
        return (response as any);
    },

    getUnreadCount: async (userId: number) => {
        const response = await axiosClient.get<ApiResponse<number>>(
            `/notifications/user/${userId}/unread-count`
        );
        return (response as any);
    },

    markAsRead: async (id: number) => {
        const response = await axiosClient.put<ApiResponse<void>>(`/notifications/${id}/read`);
        return (response as any);
    },

    markAllAsRead: async (userId: number) => {
        const response = await axiosClient.put<ApiResponse<void>>(`/notifications/user/${userId}/read-all`);
        return (response as any);
    },

    deleteNotification: async (id: number) => {
        const response = await axiosClient.delete<ApiResponse<void>>(`/notifications/${id}`);
        return (response as any);
    },

    deleteAllReadNotifications: async (userId: number) => {
        const response = await axiosClient.delete<ApiResponse<void>>(`/notifications/user/${userId}/read`);
        return (response as any);
    }
};

export default notificationService;
