export interface ChatMessage {
    id: number;
    fromUserId: number;
    fromUsername: string;
    fromEmail: string;
    toUserId: number;
    toUsername: string;
    toEmail: string;
    content: string;
    isRead: boolean;
    createdAt: string;
}

export interface ConversationUser {
    userId: number;
    username: string;
    email: string;
    unreadCount: number;
    lastMessage?: ChatMessage;
}

export interface SendChatMessageRequest {
    toEmail: string;
    content: string;
}
