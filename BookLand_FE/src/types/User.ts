import type { Role } from './Role.ts';
import type { Address } from './Address.ts';
import type { Cart } from './Cart.ts';
import type { Bill } from './Bill.ts';
import type { Wishlist } from './Wishlist.ts';
import type { BookComment } from './BookComment.ts';
import type { Notification } from './Notification.ts';

export const UserStatus = {
    ENABLE: 'ENABLE',
    DISABLE: 'DISABLE'
} as const;

export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export interface User {
    id: number;
    username: string;
    firstName?: string;
    lastName?: string;
    dob?: string;
    email: string;
    password?: string; // Should probably be excluded in frontend, but including to match entity
    phone?: string;
    status: UserStatus;
    createdAt?: string;
    roles?: Role[];
    addresses?: Address[];
    carts?: Cart[];
    bills?: Bill[];
    wishlists?: Wishlist[];
    comments?: BookComment[];
    receivedNotifications?: Notification[];
}

export interface UserRequest {
    username: string;
    firstName?: string;
    lastName?: string;
    dob?: string;
    email: string;
    password?: string;
    phone?: string;
    roleIds?: number[];
}

export interface UserUpdateRequest {
    firstName?: string;
    lastName?: string;
    dob?: string;
    email?: string;
    password?: string;
    phone?: string;
    status?: UserStatus;
    roleIds?: number[];
}
