import axiosClient from './axiosClient';
import type { ApiResponse, Page } from '../types/api';
import type { Publisher, PublisherRequest } from '../types/Publisher';

interface PublisherQueryParams {
    keyword?: string;
    page?: number;
    size?: number;
    sortBy?: string;
    sortDirection?: string;
}

const publisherService = {
    getAllPublishers: (params?: PublisherQueryParams) => {
        return axiosClient.get<any, ApiResponse<Page<Publisher>>>('/api/publishers', { params });
    },
    getPublisherById: (id: number) => {
        return axiosClient.get<any, ApiResponse<Publisher>>(`/api/publishers/${id}`);
    },
    createPublisher: (data: PublisherRequest) => {
        return axiosClient.post<any, ApiResponse<Publisher>>('/api/publishers', data);
    },
    updatePublisher: (id: number, data: PublisherRequest) => {
        return axiosClient.put<any, ApiResponse<Publisher>>(`/api/publishers/${id}`, data);
    },
    deletePublisher: (id: number) => {
        return axiosClient.delete<any, ApiResponse<void>>(`/api/publishers/${id}`);
    },
};

export default publisherService;
