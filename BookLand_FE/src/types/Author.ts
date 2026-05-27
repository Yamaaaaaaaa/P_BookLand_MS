import type { Book } from "./Book";

export interface Author {
    id: number;
    name: string;
    description?: string;
    authorImage?: string;
    books?: Book[];
}

export interface AuthorRequest {
    name: string;
    description?: string;
    authorImage?: string;
}
