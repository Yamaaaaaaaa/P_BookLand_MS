

export const BookStatus = {
    ENABLE: 'ENABLE',
    DISABLE: 'DISABLE'
} as const;

export type BookStatus = (typeof BookStatus)[keyof typeof BookStatus];

export interface Book {
    id: number;
    name: string;
    description?: string;
    originalCost: number;
    sale: number;
    finalPrice: number;
    stock: number;
    status: BookStatus;
    publishedDate?: string;
    bookImageUrl?: string;
    pin: boolean;
    authorId: number;
    authorName: string;
    publisherId: number;
    publisherName: string;
    seriesId?: number;
    seriesName?: string;
    categoryIds: number[];
    rating?: number;
    ratingCount?: number;
    volume?: string | number;
    createdAt?: string;
    updatedAt?: string;
}

// Response từ Elasticsearch /api/books/search — các trường denormalized từ ES index
export interface BookDocument {
    id: string;            // String trong ES (khác với number trong MySQL)
    name: string;
    description?: string;
    originalCost: number;
    sale: number;
    finalPrice: number;
    stock: number;
    status: BookStatus;
    bookImageUrl?: string;
    authorName: string;
    publisherName: string;
    categories: string[];  // Tên thể loại (khác với categoryIds dạng number[])
}

// Hàm normalize BookDocument → Book để tái sử dụng BookGrid và BookCard hiện có
export function normalizeBookDocument(doc: BookDocument): Book {
    return {
        id: Number(doc.id),
        name: doc.name,
        description: doc.description,
        originalCost: doc.originalCost,
        sale: doc.sale,
        finalPrice: doc.finalPrice,
        stock: doc.stock,
        status: doc.status,
        bookImageUrl: doc.bookImageUrl,
        pin: false,
        authorId: 0,
        authorName: doc.authorName,
        publisherId: 0,
        publisherName: doc.publisherName,
        categoryIds: [],
    };
}


export interface BookRequest {
    name: string;
    description?: string;
    originalCost: number;
    sale: number;
    stock: number;
    status: BookStatus;
    publishedDate?: string;
    bookImageUrl?: string;
    pin: boolean;
    authorId: number;
    publisherId: number;
    seriesId?: number;
    categoryIds: number[];
}
