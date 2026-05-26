import type { PurchaseInvoice } from './PurchaseInvoice';

export const SupplierStatus = {
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE'
} as const;

export type SupplierStatus = (typeof SupplierStatus)[keyof typeof SupplierStatus];

export interface Supplier {
    id: number;
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    status: SupplierStatus;
    purchaseInvoices?: PurchaseInvoice[];
}

export interface SupplierRequest {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    status: SupplierStatus;
}
