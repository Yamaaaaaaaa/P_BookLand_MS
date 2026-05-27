import type { Bill } from './Bill';
import type { PaymentMethod } from './PaymentMethod';

export const TransactionStatus = {
    PENDING: 'PENDING',
    SUCCESS: 'SUCCESS',
    FAILED: 'FAILED'
} as const;

export type TransactionStatus = (typeof TransactionStatus)[keyof typeof TransactionStatus];

export interface PaymentTransaction {
    id: number;
    bill: Bill;
    paymentMethod: PaymentMethod;
    provider?: string;
    amount: number;
    transactionCode?: string;
    providerTransactionId?: string;
    status: TransactionStatus;
    payUrl?: string;
    responseCode?: string;
    responseMessage?: string;
    paidAt?: string;
    createdAt?: string;
}
