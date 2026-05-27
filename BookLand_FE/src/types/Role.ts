import type { User } from './User.ts';
import type { Permission } from './Permission.ts';

export interface Role {
    id: number;
    name: string;
    description?: string;
    users?: User[];
    permissions?: Permission[];
}

export interface RoleRequest {
    name: string;
    description?: string;
}

export interface RoleQueryParams {
    keyword?: string;
    page?: number;
    size?: number;
    sortBy?: string;
    sortDirection?: string;
}
