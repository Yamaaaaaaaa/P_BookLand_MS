import type { BillBook } from './BillBook.ts';
import type { PaymentTransaction } from './PaymentTransaction.ts';
import type { EventLog } from './EventLog.ts';

export const BillStatus = {
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    SHIPPING: 'SHIPPING',
    SHIPPED: 'SHIPPED',
    COMPLETED: 'COMPLETED',
    CANCELED: 'CANCELED'
} as const;

export type BillStatus = (typeof BillStatus)[keyof typeof BillStatus];

export interface Bill {
    id: number;
    userId: number;
    userName: string;
    fullName?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    notes?: string;
    paymentMethodId: number;
    paymentMethodName: string;
    shippingMethodId: number;
    shippingMethodName: string;
    shippingCost: number;
    totalCost: number;
    approvedById?: number;
    approvedByName?: string;
    status: BillStatus;
    paymentStatus?: string;
    createdAt?: string;
    updatedAt?: string;
    approvedAt?: string;
    books?: BillBook[];
    transactions?: PaymentTransaction[];
    eventLogs?: EventLog[];
}

export interface CreateBillRequest {
    userId: number;
    fullName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    postalCode?: string;
    notes?: string;
    paymentMethodId: number;
    shippingMethodId: number;
    books: {
        bookId: number;
        quantity: number;
    }[];
}

export interface UpdateBillStatusRequest {
    status: BillStatus;
    note?: string;
}
