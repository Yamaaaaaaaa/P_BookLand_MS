import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// ── Types ──────────────────────────────────────────────────────────────────

export interface ChatbotSession {
    sessionId: string;
    sessionType: 'GUEST' | 'USER';
    status: 'ACTIVE' | 'ESCALATED' | 'CLOSED';
    startedAt: string;
    lastActivity: string;
    messageCount: number;
}

export interface ChatMessageDTO {
    id: number;
    sessionId: string;
    role: 'USER' | 'ASSISTANT' | 'ADMIN' | 'SYSTEM';
    contentType: 'TEXT' | 'PRODUCT_CARD' | 'QUICK_REPLY' | 'SYSTEM_NOTICE';
    content: string;
    aiConfidence?: number;
    metadata?: string; // JSON string
    createdAt: string;
}

export interface BookSuggestion {
    id: number;
    name: string;
    bookImageUrl?: string;
    originalCost: number;
    sale: number;
    finalPrice: number;
    stock: number;
    reason?: string;
}

export interface ChatbotMessageResponse {
    userMessage: ChatMessageDTO;
    botResponse: ChatMessageDTO;
    confidence: number;
    quickReplies?: string[];
    productSuggestions?: BookSuggestion[];
    suggestEscalation?: boolean;
}

export interface EscalationResponse {
    id: string;
    sessionId: string;
    reason: string;
    category: string;
    priority: string;
    status: string;
    userId?: number;
    username?: string;
    adminId?: number;
    adminName?: string;
    aiSummary?: string;
    aiSuggestion?: string;
    createdAt: string;
    messageCount?: number;
    lastMessagePreview?: string;
}

// ── Guest Token Management ─────────────────────────────────────────────────

const GUEST_TOKEN_KEY = 'bookland_guest_token';
const CHATBOT_SESSION_KEY = 'bookland_chatbot_session';

export function getOrCreateGuestToken(): string {
    let token = localStorage.getItem(GUEST_TOKEN_KEY);
    if (!token) {
        token = generateUUID();
        localStorage.setItem(GUEST_TOKEN_KEY, token);
    }
    return token;
}

function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
}

function getAuthHeaders(): Record<string, string> {
    const customerToken = localStorage.getItem('customerToken');
    const guestToken = getOrCreateGuestToken();
    const headers: Record<string, string> = {
        'X-Guest-Token': guestToken,
    };
    if (customerToken) {
        headers['Authorization'] = `Bearer ${customerToken}`;
    }
    return headers;
}

// ── API Client ─────────────────────────────────────────────────────────────

const chatbotApi = axios.create({ baseURL: BASE_URL });

// ── Service ────────────────────────────────────────────────────────────────

const chatbotService = {
    /**
     * Tạo hoặc resume chatbot session.
     * Lưu sessionId vào localStorage để dùng lại.
     */
    createOrResumeSession: async (): Promise<ChatbotSession> => {
        const guestToken = getOrCreateGuestToken();
        const response = await chatbotApi.post(
            '/chatbot/sessions',
            { guestToken },
            { headers: getAuthHeaders() }
        );
        const session: ChatbotSession = response.data.result;
        localStorage.setItem(CHATBOT_SESSION_KEY, session.sessionId);
        return session;
    },

    /**
     * Lấy sessionId đã lưu hoặc tạo mới.
     */
    getActiveSessionId: (): string | null => {
        return localStorage.getItem(CHATBOT_SESSION_KEY);
    },

    /**
     * Gửi tin nhắn và nhận phản hồi bot.
     */
    sendMessage: async (
        sessionId: string,
        content: string
    ): Promise<ChatbotMessageResponse> => {
        const response = await chatbotApi.post(
            `/chatbot/sessions/${sessionId}/messages`,
            { content },
            { headers: getAuthHeaders() }
        );
        return response.data.result;
    },

    /**
     * Lấy lịch sử chat của session.
     */
    getHistory: async (sessionId: string): Promise<ChatMessageDTO[]> => {
        const response = await chatbotApi.get(
            `/chatbot/sessions/${sessionId}/messages`,
            { headers: getAuthHeaders() }
        );
        return response.data.result;
    },

    /**
     * Đóng session.
     */
    closeSession: async (sessionId: string): Promise<void> => {
        await chatbotApi.delete(
            `/chatbot/sessions/${sessionId}`,
            { headers: getAuthHeaders() }
        );
        localStorage.removeItem(CHATBOT_SESSION_KEY);
    },

    /**
     * Tạo escalation — chuyển tiếp sang admin.
     */
    createEscalation: async (
        sessionId: string,
        reason: string = 'USER_REQUEST',
        message?: string
    ): Promise<EscalationResponse> => {
        const response = await chatbotApi.post(
            '/chatbot/escalations',
            { sessionId, reason, message },
            { headers: getAuthHeaders() }
        );
        return response.data.result;
    },

    /**
     * Gửi feedback 👍/👎 cho bot response.
     */
    sendFeedback: async (
        messageId: number,
        sessionId: string,
        feedbackType: 'thumbs_up' | 'thumbs_down',
        comment?: string
    ): Promise<void> => {
        await chatbotApi.post(
            `/chatbot/messages/${messageId}/feedback`,
            { feedbackType: feedbackType.toUpperCase(), comment, sessionId },
            { headers: getAuthHeaders() }
        );
    },

    // ── Admin APIs ─────────────────────────────────────────────────────────

    /**
     * Admin: lấy escalation queue.
     */
    getEscalationQueue: async (
        status: string = 'PENDING',
        page: number = 0,
        size: number = 20
    ): Promise<{ content: EscalationResponse[]; totalElements: number }> => {
        const adminToken = localStorage.getItem('adminToken');
        const response = await chatbotApi.get('/chatbot/escalations', {
            params: { status, page, size },
            headers: { Authorization: `Bearer ${adminToken}` },
        });
        return response.data.result;
    },

    /**
     * Admin: nhận xử lý escalation.
     */
    assignEscalation: async (escalationId: string): Promise<EscalationResponse> => {
        const adminToken = localStorage.getItem('adminToken');
        const response = await chatbotApi.patch(
            `/chatbot/escalations/${escalationId}/assign`,
            {},
            { headers: { Authorization: `Bearer ${adminToken}` } }
        );
        return response.data.result;
    },

    /**
     * Admin: đóng escalation.
     */
    resolveEscalation: async (escalationId: string): Promise<EscalationResponse> => {
        const adminToken = localStorage.getItem('adminToken');
        const response = await chatbotApi.patch(
            `/chatbot/escalations/${escalationId}/resolve`,
            {},
            { headers: { Authorization: `Bearer ${adminToken}` } }
        );
        return response.data.result;
    },

    /**
     * Admin: lấy số lượng escalation đang chờ.
     */
    getPendingEscalationCount: async (): Promise<number> => {
        const adminToken = localStorage.getItem('adminToken');
        const response = await chatbotApi.get('/chatbot/escalations/count', {
            headers: { Authorization: `Bearer ${adminToken}` },
        });
        return response.data.result;
    },
};

export default chatbotService;
