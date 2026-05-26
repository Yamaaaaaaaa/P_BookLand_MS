import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, ArrowLeft, MessageCircle } from 'lucide-react';
import { useWebSocket } from '../../context/WebSocketContext';
import chatService from '../../api/chatService';
import type { ChatMessage, ConversationUser } from '../../types/Chat';
import '../../styles/pages/admin-chat-detail.css';
import { useTranslation } from 'react-i18next';

const AdminChatDetailPage: React.FC = () => {
    const { t } = useTranslation();
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const [userInfo, setUserInfo] = useState<ConversationUser | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { subscribe, isConnected } = useWebSocket();

    // Load user info and chat history
    useEffect(() => {
        if (userId) {
            loadUserInfo();
            loadChatHistory();
            markAsRead();
        }
    }, [userId]);

    // WebSocket subscription for real-time messages
    useEffect(() => {
        if (isConnected && userId) {
            const unsubscribe = subscribe('/user/queue/chat', (message) => {
                try {
                    const newMsg: ChatMessage = JSON.parse(message.body);

                    // If message is from or to currently selected user, add to messages
                    if (newMsg.fromUserId === parseInt(userId) || newMsg.toUserId === parseInt(userId)) {
                        setMessages(prev => [...prev, newMsg]);
                        scrollToBottom();

                        // Mark as read if message is from the other user
                        if (newMsg.fromUserId === parseInt(userId)) {
                            markAsRead();
                        }
                    }
                } catch (error) {
                    console.error('Failed to parse chat message:', error);
                }
            });
            return () => unsubscribe();
        }
    }, [isConnected, userId]);

    // Auto-scroll to bottom
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const loadUserInfo = async () => {
        try {
            const response = await chatService.getConversations();
            if (response.code === 1000) {
                const user = response.result.find((u: ConversationUser) => u.userId === parseInt(userId!));
                setUserInfo(user || null);
            }
        } catch (error) {
            console.error('Failed to load user info:', error);
        }
    };

    const loadChatHistory = async () => {
        setIsLoading(true);
        try {
            const response = await chatService.getChatHistory(parseInt(userId!));
            if (response.code === 1000) {
                setMessages(response.result || []);
            }
        } catch (error) {
            console.error('Failed to load chat history:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const markAsRead = async () => {
        try {
            await chatService.markAsRead(parseInt(userId!));
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !userInfo) return;

        try {
            const response = await chatService.sendMessage({
                toEmail: userInfo.email,
                content: newMessage.trim()
            });

            if (response.code === 1000) {
                setMessages(prev => [...prev, response.result]);
                setNewMessage('');
            }
        } catch (error) {
            console.error('Failed to send message:', error);
        }
    };

    const handleBack = () => {
        navigate('/admin/chat');
    };

    if (!userInfo && !isLoading) {
        return (
            <div className="admin-chat-detail-page">
                <div className="admin-chat-detail-error">
                    <MessageCircle size={64} />
                    <p>{t('admin.chat.user_not_found')}</p>
                    <button onClick={handleBack} className="btn-primary">
                        {t('admin.chat.back')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-chat-detail-page">
            {/* Header */}
            <div className="admin-chat-detail-header">
                <button onClick={handleBack} className="admin-chat-detail-back">
                    <ArrowLeft size={24} />
                </button>
                {userInfo && (
                    <div className="admin-chat-detail-user">
                        <div className="admin-chat-detail-avatar">
                            {userInfo.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div className="admin-chat-detail-name">{userInfo.username}</div>
                            <div className="admin-chat-detail-email">{userInfo.email}</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Messages */}
            <div className="admin-chat-detail-messages">
                {isLoading ? (
                    <div className="admin-chat-detail-loading">{t('admin.chat.loading')}</div>
                ) : messages.length === 0 ? (
                    <div className="admin-chat-detail-empty">
                        <MessageCircle size={48} />
                        <p>{t('admin.chat.no_messages')}</p>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`admin-chat-detail-message ${msg.toUserId === parseInt(userId!)
                                ? 'admin-chat-detail-message-sent'
                                : 'admin-chat-detail-message-received'
                                }`}
                        >
                            <div className="admin-chat-detail-message-content">
                                {msg.content}
                            </div>
                            <div className="admin-chat-detail-message-time">
                                {new Date(msg.createdAt).toLocaleTimeString('vi-VN', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form className="admin-chat-detail-input-container" onSubmit={handleSendMessage}>
                <input
                    type="text"
                    className="admin-chat-detail-input"
                    placeholder={t('admin.chat.input_placeholder')}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                />
                <button
                    type="submit"
                    className="admin-chat-detail-send-button"
                    disabled={!newMessage.trim()}
                >
                    <Send size={20} />
                </button>
            </form>
        </div>
    );
};

export default AdminChatDetailPage;
