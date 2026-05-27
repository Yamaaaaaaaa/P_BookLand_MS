import axiosClient from './axiosClient';
import type { ApiResponse, Page } from '../types/api';
import type { Category, CategoryRequest } from '../types/Category';

const categoryService = {
    getAll: (params?: any) => {
        return axiosClient.get<any, ApiResponse<Page<Category>>>('/api/categories', { params });
    },
    getById: (id: number) => {
        return axiosClient.get<any, ApiResponse<Category>>(`/api/categories/${id}`);
    },
    create: (data: CategoryRequest) => {
        return axiosClient.post<any, ApiResponse<Category>>('/api/categories', data);
    },
    update: (id: number, data: CategoryRequest) => {
        return axiosClient.put<any, ApiResponse<Category>>(`/api/categories/${id}`, data);
    },
    delete: (id: number) => {
        return axiosClient.delete<any, ApiResponse<void>>(`/api/categories/${id}`);
    }
};

export default categoryService;
