import axiosClient from './axiosClient';
import type { ApiResponse, Page } from '../types/api';
import type { Serie, SerieRequest } from '../types/Serie';

interface SerieQueryParams {
    keyword?: string;
    page?: number;
    size?: number;
    sortBy?: string;
    sortDirection?: string;
}

const serieService = {
    getAllSeries: (params?: SerieQueryParams) => {
        return axiosClient.get<any, ApiResponse<Page<Serie>>>('/api/series', { params });
    },
    getSerieById: (id: number) => {
        return axiosClient.get<any, ApiResponse<Serie>>(`/api/series/${id}`);
    },
    createSerie: (data: SerieRequest) => {
        return axiosClient.post<any, ApiResponse<Serie>>('/api/series', data);
    },
    updateSerie: (id: number, data: SerieRequest) => {
        return axiosClient.put<any, ApiResponse<Serie>>(`/api/series/${id}`, data);
    },
    deleteSerie: (id: number) => {
        return axiosClient.delete<any, ApiResponse<void>>(`/api/series/${id}`);
    },
};

export default serieService;
