import axiosClient from './axiosClient';
import type { ApiResponse, Page } from '../types/api';
import type { Book, BookDocument, BookRequest } from '../types/Book';

interface BookQueryParams {
    keyword?: string;
    status?: string;
    authorIds?: number[];
    publisherIds?: number[];
    seriesIds?: number[];
    categoryIds?: number[];
    pinned?: boolean;
    minPrice?: number;
    maxPrice?: number;
    page?: number;
    size?: number;
    sortBy?: string;
    sortDirection?: string;
}

interface SearchQueryParams {
    keyword?: string;
    page?: number;
    size?: number;
    sortBy?: string;
    sortDirection?: string;
}

const bookService = {
    getAllBooks: (params?: BookQueryParams) => {
        return axiosClient.get<any, ApiResponse<Page<Book>>>('/api/books', { params });
    },
    searchBooks: (params?: SearchQueryParams) => {
        return axiosClient.get<any, ApiResponse<Page<BookDocument>>>('/api/books/search', { params });
    },
    getBookById: (id: number) => {
        return axiosClient.get<any, ApiResponse<Book>>(`/api/books/${id}`);
    },
    createBook: (data: BookRequest) => {
        return axiosClient.post<any, ApiResponse<Book>>('/api/books', data);
    },
    updateBook: (id: number, data: BookRequest) => {
        return axiosClient.put<any, ApiResponse<Book>>(`/api/books/${id}`, data);
    },
    deleteBook: (id: number) => {
        return axiosClient.delete<any, ApiResponse<void>>(`/api/books/${id}`);
    },
    updateBookStock: (id: number, quantity: number) => {
        return axiosClient.patch<any, ApiResponse<Book>>(`/api/books/${id}/stock`, null, { params: { quantity } });
    },
    getBestSellingBooks: (params?: BookQueryParams & { period?: string }) => {
        return axiosClient.get<any, ApiResponse<Page<Book>>>('/api/books/best-sellers', { params });
    },
};

export default bookService;
