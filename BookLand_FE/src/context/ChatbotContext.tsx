import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useRef,
    useCallback,
} from 'react';
import chatbotService, {
    type ChatbotSession,
    type ChatMessageDTO,
    type EscalationResponse,
} from '../api/chatbotService';

// ── Types ──────────────────────────────────────────────────────────────────

interface ChatbotState {
    isOpen: boolean;
    isLoading: boolean;
    isSending: boolean;
    session: ChatbotSession | null;
    messages: ChatMessageDTO[];
    suggestEscalation: boolean;
    escalation: EscalationResponse | null;
    error: string | null;
}

interface ChatbotContextType extends ChatbotState {
    openWidget: () => void;
    closeWidget: () => void;
    sendMessage: (content: string) => Promise<void>;
    requestEscalation: (message?: string) => Promise<void>;
    dismissEscalation: () => void;
    unreadCount: number;
}

// ── Context ────────────────────────────────────────────────────────────────

const ChatbotContext = createContext<ChatbotContextType | null>(null);

export const useChatbot = () => {
    const ctx = useContext(ChatbotContext);
    if (!ctx) throw new Error('useChatbot must be used within ChatbotProvider');
    return ctx;
};

// ── Provider ───────────────────────────────────────────────────────────────

export const ChatbotProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, setState] = useState<ChatbotState>({
        isOpen: false,
        isLoading: false,
        isSending: false,
        session: null,
        messages: [],
        suggestEscalation: false,
        escalation: null,
        error: null,
    });
    const [unreadCount, setUnreadCount] = useState(0);
    const sessionInitRef = useRef(false);

    // Khởi tạo session khi component mount
    useEffect(() => {
        if (sessionInitRef.current) return;
        sessionInitRef.current = true;
        initSession();
    }, []);

    const initSession = useCallback(async () => {
        try {
            const session = await chatbotService.createOrResumeSession();
            const history = await chatbotService.getHistory(session.sessionId);
            setState(prev => ({
                ...prev,
                session,
                messages: history,
                error: null,
            }));
        } catch (err) {
            console.error('Failed to init chatbot session:', err);
            setState(prev => ({ ...prev, error: 'Không thể khởi tạo chatbot' }));
        }
    }, []);

    const openWidget = useCallback(() => {
        window.dispatchEvent(new CustomEvent('close-admin-chat'));
        setState(prev => ({ ...prev, isOpen: true }));
        setUnreadCount(0);
    }, []);

    const closeWidget = useCallback(() => {
        setState(prev => ({ ...prev, isOpen: false }));
    }, []);

    const sendMessage = useCallback(async (content: string) => {
        if (!state.session) return;

        setState(prev => ({ ...prev, isSending: true, error: null }));

        try {
            const response = await chatbotService.sendMessage(state.session.sessionId, content);

            setState(prev => ({
                ...prev,
                isSending: false,
                messages: [
                    ...prev.messages,
                    response.userMessage,
                    response.botResponse,
                ],
                suggestEscalation: response.suggestEscalation || false,
            }));

            // Nếu widget đóng → tăng unread
            if (!state.isOpen) {
                setUnreadCount(prev => prev + 1);
            }
        } catch (err) {
            console.error('Failed to send message:', err);
            setState(prev => ({
                ...prev,
                isSending: false,
                error: 'Không gửi được tin nhắn. Thử lại nhé!',
            }));
        }
    }, [state.session, state.isOpen]);

    const requestEscalation = useCallback(async (message?: string) => {
        if (!state.session) return;
        setState(prev => ({ ...prev, isLoading: true }));
        try {
            const escalation = await chatbotService.createEscalation(
                state.session.sessionId,
                'USER_REQUEST',
                message
            );
            // Reload messages để thấy system notice
            const history = await chatbotService.getHistory(state.session.sessionId);
            setState(prev => ({
                ...prev,
                isLoading: false,
                escalation,
                messages: history,
                suggestEscalation: false,
            }));
        } catch (err) {
            console.error('Failed to create escalation:', err);
            setState(prev => ({ ...prev, isLoading: false, error: 'Không thể kết nối admin' }));
        }
    }, [state.session]);

    const dismissEscalation = useCallback(() => {
        setState(prev => ({ ...prev, suggestEscalation: false }));
    }, []);

    return (
        <ChatbotContext.Provider
            value={{
                ...state,
                openWidget,
                closeWidget,
                sendMessage,
                requestEscalation,
                dismissEscalation,
                unreadCount,
            }}
        >
            {children}
        </ChatbotContext.Provider>
    );
};
