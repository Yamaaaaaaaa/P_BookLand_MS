import axiosClient from './axiosClient';
import type { ApiResponse, Page } from '../types/api';
import type { PaymentMethod, PaymentMethodRequest } from '../types/PaymentMethod';

const paymentMethodService = {
    getAll: (params?: any) => {
        return axiosClient.get<any, ApiResponse<Page<PaymentMethod>>>('/api/payment-methods', { params });
    },
    getById: (id: number) => {
        return axiosClient.get<any, ApiResponse<PaymentMethod>>(`/api/payment-methods/${id}`);
    },
    create: (data: PaymentMethodRequest) => {
        return axiosClient.post<any, ApiResponse<PaymentMethod>>('/api/payment-methods', data);
    },
    update: (id: number, data: PaymentMethodRequest) => {
        return axiosClient.put<any, ApiResponse<PaymentMethod>>(`/api/payment-methods/${id}`, data);
    },
    delete: (id: number) => {
        return axiosClient.delete<any, ApiResponse<void>>(`/api/payment-methods/${id}`);
    }
};

export default paymentMethodService;
