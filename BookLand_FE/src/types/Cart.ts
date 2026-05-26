import type { CartItem } from './CartItem.ts';

export const CartStatus = {
    BUYING: 'BUYING',
    CHECKED_OUT: 'CHECKED_OUT'
} as const;

export type CartStatus = (typeof CartStatus)[keyof typeof CartStatus];

export interface Cart {
    id: number;
    userId: number;
    status: CartStatus;
    totalAmount: number;
    createdAt?: string;
    updatedAt?: string;
    items: CartItem[];
}

export interface AddToCartRequest {
    bookId: number;
    quantity: number;
}

export interface UpdateCartItemRequest {
    quantity: number;
}
