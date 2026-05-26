import type { User } from './User.ts';

export interface Address {
    id: number;
    user: User;
    contactPhone?: string;
    addressDetail?: string;
    isDefault: boolean;
}
