import type { Role } from './Role';

export interface Permission {
    id: number;
    name: string;
    description?: string;
    roles?: Role[];
}
