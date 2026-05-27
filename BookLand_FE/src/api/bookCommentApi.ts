import axiosClient from './axiosClient';
import type { ApiResponse } from '../types/api';
import type { BookComment, BookCommentRequest, BookCommentSummaryResponse } from '../types/BookComment';

const bookCommentApi = {
    getCommentsByBook: (bookId: number, params?: { page?: number; size?: number; sortBy?: string; sortDirection?: string }) => {
        return axiosClient.get<any, ApiResponse<BookCommentSummaryResponse>>(`/book-comments/book/${bookId}`, { params });
    },
    
    getCommentsByUser: (params?: { page?: number; size?: number; sortBy?: string; sortDirection?: string }) => {
        return axiosClient.get<any, ApiResponse<BookComment[]>>('/book-comments/user', { params });
    },

    getCommentsByBill: (billId: number) => {
        return axiosClient.get<any, ApiResponse<BookComment[]>>(`/book-comments/bill/${billId}`);
    },

    createComment: (data: BookCommentRequest) => {
        return axiosClient.post<any, ApiResponse<BookComment>>('/book-comments', data);
    },

    updateComment: (id: number, data: BookCommentRequest) => {
        return axiosClient.put<any, ApiResponse<BookComment>>(`/book-comments/${id}`, data);
    },

    deleteComment: (id: number) => {
        return axiosClient.delete<any, ApiResponse<string>>(`/book-comments/${id}`);
    }
};

export default bookCommentApi;
