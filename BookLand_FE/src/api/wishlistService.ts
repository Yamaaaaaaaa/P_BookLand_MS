import axiosClient from './axiosClient';
import type { ApiResponse } from '../types/api';
import type { Wishlist, AddToWishlistRequest } from '../types/Wishlist';

const wishlistService = {
    // Lấy wishlist của user hiện tại qua JWT (endpoint mới)
    getMyWishlist: () => {
        return axiosClient.get<any, ApiResponse<Wishlist[]>>(`/api/wishlist/my`);
    },
    getUserWishlist: (userId: number) => {
        return axiosClient.get<any, ApiResponse<Wishlist[]>>(`/api/wishlist/${userId}`);
    },
    addToWishlist: (userId: number, data: AddToWishlistRequest) => {
        return axiosClient.post<any, ApiResponse<Wishlist>>(`/api/wishlist/${userId}`, data);
    },
    removeFromWishlist: (userId: number, bookId: number) => {
        return axiosClient.delete<any, ApiResponse<void>>(`/api/wishlist/${userId}/books/${bookId}`);
    },
    clearWishlist: (userId: number) => {
        return axiosClient.delete<any, ApiResponse<void>>(`/api/wishlist/${userId}/clear`);
    },
    checkIsInWishlist: (userId: number, bookId: number) => {
        return axiosClient.get<any, ApiResponse<boolean>>(`/api/wishlist/${userId}/check/${bookId}`);
    }
};

export default wishlistService;
