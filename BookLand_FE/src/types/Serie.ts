import type { Book } from './Book';

export interface Serie {
    id: number;
    name: string;
    description?: string;
    books?: Book[];
}

export interface SerieRequest {
    name: string;
    description?: string;
}
