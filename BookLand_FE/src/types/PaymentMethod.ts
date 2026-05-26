import type { Bill } from './Bill';
import type { PaymentTransaction } from './PaymentTransaction';

export interface PaymentMethod {
    id: number;
    name: string;
    providerCode: string;
    isOnline: boolean;
    description?: string;
    bills?: Bill[];
    transactions?: PaymentTransaction[];
}

export interface PaymentMethodRequest {
    name: string;
    providerCode?: string;
    isOnline: boolean;
    description?: string;
}
