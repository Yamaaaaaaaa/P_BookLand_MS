export type NotificationStatus = 'UNREAD' | 'READ' | 'ARCHIVED';

export interface Notification {
    id: number;
    fromUserId?: number;
    fromUsername?: string;
    toUserId: number;
    toUsername: string;
    type: string;
    title: string;
    content: string;
    status: NotificationStatus;
    readAt?: string;
    createdAt: string;
}
