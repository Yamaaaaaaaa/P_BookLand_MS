import axiosClient from './axiosClient';
import type { ChatMessage, ConversationUser, SendChatMessageRequest } from '../types/Chat';

interface ApiResponse<T> {
    code: number;
    message?: string;
    result: T;
}

const chatService = {
    getChatHistory: async (otherUserId: number): Promise<ApiResponse<ChatMessage[]>> => {
        return await axiosClient.get(`/chat/history/${otherUserId}`) as any;
    },

    getConversations: async (): Promise<ApiResponse<ConversationUser[]>> => {
        return await axiosClient.get('/chat/conversations') as any;
    },

    sendMessage: async (request: SendChatMessageRequest): Promise<ApiResponse<ChatMessage>> => {
        return await axiosClient.post('/chat/send', request) as any;
    },

    markAsRead: async (otherUserId: number): Promise<ApiResponse<void>> => {
        return await axiosClient.put(`/chat/mark-read/${otherUserId}`) as any;
    },

    getUnreadCount: async (): Promise<ApiResponse<number>> => {
        return await axiosClient.get('/chat/unread-count') as any;
    }
};

export default chatService;
