import axiosClient from './axiosClient';
import type { ApiResponse, Page } from '../types/api';
import type { Author, AuthorRequest } from '../types/Author';

interface AuthorQueryParams {
    keyword?: string;
    page?: number;
    size?: number;
    sortBy?: string;
    sortDirection?: string;
}   

const authorService = {
    getAllAuthors: (params?: AuthorQueryParams) => {
        return axiosClient.get<any, ApiResponse<Page<Author>>>('/api/authors', { params });
    },
    getAuthorById: (id: number) => {
        return axiosClient.get<any, ApiResponse<Author>>(`/api/authors/${id}`);
    },
    createAuthor: (data: AuthorRequest) => {
        return axiosClient.post<any, ApiResponse<Author>>('/api/authors', data);
    },
    updateAuthor: (id: number, data: AuthorRequest) => {
        return axiosClient.put<any, ApiResponse<Author>>(`/api/authors/${id}`, data);
    },
    deleteAuthor: (id: number) => {
        return axiosClient.delete<any, ApiResponse<void>>(`/api/authors/${id}`);
    },
};

export default authorService;
