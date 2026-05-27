import type { Book } from './Book';

export interface Publisher {
    id: number;
    name: string;
    description?: string;
    books?: Book[];
}

export interface PublisherRequest {
    name: string;
    description?: string;
}
