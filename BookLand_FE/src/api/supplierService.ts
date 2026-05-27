import axiosClient from './axiosClient';
import type { ApiResponse, Page } from '../types/api';
import type { Supplier, SupplierRequest } from '../types/Supplier';

interface SupplierQueryParams {
    keyword?: string;
    status?: string;
    page?: number;
    size?: number;
    sortBy?: string;
    sortDirection?: string;
}

const supplierService = {
    getAllSuppliers: (params?: SupplierQueryParams) => {
        return axiosClient.get<any, ApiResponse<Page<Supplier>>>('/api/suppliers', { params });
    },
    getSupplierById: (id: number) => {
        return axiosClient.get<any, ApiResponse<Supplier>>(`/api/suppliers/${id}`);
    },
    createSupplier: (data: SupplierRequest) => {
        return axiosClient.post<any, ApiResponse<Supplier>>('/api/suppliers', data);
    },
    updateSupplier: (id: number, data: SupplierRequest) => {
        return axiosClient.put<any, ApiResponse<Supplier>>(`/api/suppliers/${id}`, data);
    },
    deleteSupplier: (id: number) => {
        return axiosClient.delete<any, ApiResponse<void>>(`/api/suppliers/${id}`);
    },
};

export default supplierService;
