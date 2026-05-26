import axiosClient from './axiosClient';
import type { ApiResponse, Page } from '../types/api';
import type { Bill, CreateBillRequest, UpdateBillStatusRequest } from '../types/Bill';

interface BillQueryParams {
    userId?: number;
    status?: string;
    fromDate?: string;
    toDate?: string;
    minCost?: number;
    maxCost?: number;
    page?: number;
    size?: number;
    sortBy?: string;
    sortDirection?: string;
}

export interface PreviewBillRequest {
    books: { bookId: number; quantity: number }[];
    shippingMethodId: number;
}


export interface BillPreviewBookDTO {
    bookId: number;
    bookName: string;
    bookImageUrl: string;
    originalPrice: number;
    eventDiscountedPrice: number;
    finalPrice: number;
    quantity: number;
    subtotal: number;
    hasEventDiscount: boolean;
}

export interface BillPreviewDTO {
    books: BillPreviewBookDTO[];
    originalSubtotal: number;
    discountedSubtotal: number;
    shippingCost: number;
    totalSaved: number;
    grandTotal: number;
    hasEventApplied: boolean;
    appliedEventId?: number;
    appliedEventName?: string;
    appliedEventType?: string;
}

const billService = {
    getAllBills: (params?: BillQueryParams) => {
        return axiosClient.get<any, ApiResponse<Page<Bill>>>('/api/bills', { params });
    },
    getBillById: (id: number) => {
        return axiosClient.get<any, ApiResponse<Bill>>(`/api/bills/${id}`);
    },
    createBill: (data: CreateBillRequest) => {
        return axiosClient.post<any, ApiResponse<Bill>>('/api/bills', data);
    },
    previewBill: (data: PreviewBillRequest) => {
        return axiosClient.post<any, ApiResponse<BillPreviewDTO>>('/api/bills/preview', data);
    },
    updateBillStatus: (id: number, data: UpdateBillStatusRequest) => {
        return axiosClient.patch<any, ApiResponse<Bill>>(`/api/bills/${id}/status`, data);
    },
    deleteBill: (id: number) => {
        return axiosClient.delete<any, ApiResponse<void>>(`/api/bills/${id}`);
    },
    
    // Customer own bills
    getOwnBills: (params?: Omit<BillQueryParams, 'userId'>) => {
        return axiosClient.get<any, ApiResponse<Page<Bill>>>('/api/bills/my-bills', { params });
    },

    // Shipper: get list of SHIPPING orders
    getShippingList: (params?: { page?: number; size?: number; sortBy?: string; sortDirection?: string }) => {
        return axiosClient.get<any, ApiResponse<Page<Bill>>>('/api/bills/shipping-list', { params });
    },

    // Shipper: confirm delivered (SHIPPING -> SHIPPED)
    confirmDelivered: (id: number) => {
        return axiosClient.patch<any, ApiResponse<Bill>>(`/api/bills/${id}/confirm-delivered`);
    },
};

export default billService;
