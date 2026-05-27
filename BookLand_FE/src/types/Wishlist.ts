import type { User } from './User.ts';
import type { Book } from './Book.ts';

export interface Wishlist {
    id: number;
    user: User;
    book: Book;
    createdAt?: string;
}

export interface AddToWishlistRequest {
    bookId: number;
}
