import type { Page } from './api';

export interface BookComment {
    id: number;
    bookId: number;
    bookTitle: string;
    userId: number;
    userName: string;
    rating: number; // 1-5
    comment: string;
    createdAt: string; // ISO date string
    updatedAt: string;
    billId: number;
}

export interface BookCommentRequest {
    userId: number;
    bookId: number;
    billId: number;
    rating: number;
    content: string;
}

export interface BookCommentSummaryResponse {
    averageRating: number;
    totalComments: number;
    ratingCounts: Record<number, number>; // e.g. { 5: 10, 4: 5 }
    comments: Page<BookComment>;
}
