import axiosClient from './axiosClient';
import type { ApiResponse, Page } from '../types/api';
import type { ShippingMethod, ShippingMethodRequest } from '../types/ShippingMethod';

interface ShippingMethodQueryParams {
    page?: number;
    size?: number;
    sortBy?: string;
    sortDirection?: string;
}

const shippingMethodService = {
    getAllShippingMethods: (params?: ShippingMethodQueryParams) => {
        return axiosClient.get<any, ApiResponse<Page<ShippingMethod>>>('/api/shipping-methods', { params });
    },
    getShippingMethodById: (id: number) => {
        return axiosClient.get<any, ApiResponse<ShippingMethod>>(`/api/shipping-methods/${id}`);
    },
    createShippingMethod: (data: ShippingMethodRequest) => {
        return axiosClient.post<any, ApiResponse<ShippingMethod>>('/api/shipping-methods', data);
    },
    updateShippingMethod: (id: number, data: ShippingMethodRequest) => {
        return axiosClient.put<any, ApiResponse<ShippingMethod>>(`/api/shipping-methods/${id}`, data);
    },
    deleteShippingMethod: (id: number) => {
        return axiosClient.delete<any, ApiResponse<void>>(`/api/shipping-methods/${id}`);
    },
};

export default shippingMethodService;
