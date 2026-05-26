export interface Category {
    id: number;
    name: string;
    description?: string;
    pin?: boolean;
    imageUrl?: string;
    bookCount?: number;
}

export interface CategoryRequest {
    name: string;
    description?: string;
    pin?: boolean;
    imageUrl?: string;
}
