import React, { useState, useEffect, useRef } from 'react';
import { Send, Search, MessageCircle } from 'lucide-react';
import { useWebSocket } from '../../context/WebSocketContext';
import chatService from '../../api/chatService';
import type { ChatMessage, ConversationUser } from '../../types/Chat';
import '../../styles/pages/admin-chat.css';
import { useTranslation } from 'react-i18next';

const AdminChatPage: React.FC = () => {
    const { t } = useTranslation();
    const [conversations, setConversations] = useState<ConversationUser[]>([]);
    const [selectedUser, setSelectedUser] = useState<ConversationUser | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { subscribe, isConnected } = useWebSocket();

    // Load conversations on mount
    useEffect(() => {
        loadConversations();
    }, []);

    // WebSocket subscription for real-time messages
    useEffect(() => {
        if (isConnected) {
            const unsubscribe = subscribe('/user/queue/chat', (message) => {
                try {
                    const newMsg: ChatMessage = JSON.parse(message.body);

                    // If message is from or to currently selected user, add to messages
                    if (selectedUser &&
                        (newMsg.fromUserId === selectedUser.userId || newMsg.toUserId === selectedUser.userId)) {
                        setMessages(prev => [...prev, newMsg]);
                        scrollToBottom();
                    }

                    // Reload conversations to update unread count
                    loadConversations();
                } catch (error) {
                    console.error('Failed to parse chat message:', error);
                }
            });
            return () => unsubscribe();
        }
    }, [isConnected, selectedUser]);

    // Load chat history when user is selected
    useEffect(() => {
        if (selectedUser) {
            loadChatHistory(selectedUser.userId);
            markAsRead(selectedUser.userId);
        }
    }, [selectedUser]);

    // Auto-scroll to bottom
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const loadConversations = async () => {
        try {
            const response = await chatService.getConversations();
            setConversations(response.result || []);
        } catch (error) {
            console.error('Failed to load conversations:', error);
        }
    };

    const loadChatHistory = async (userId: number) => {
        setIsLoading(true);
        try {
            const response = await chatService.getChatHistory(userId);
            setMessages(response.result || []);
        } catch (error) {
            console.error('Failed to load chat history:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const markAsRead = async (userId: number) => {
        try {
            await chatService.markAsRead(userId);
            loadConversations(); // Reload to update unread count
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedUser) return;

        try {
            const response = await chatService.sendMessage({
                toEmail: selectedUser.email,
                content: newMessage.trim()
            });

            setMessages(prev => [...prev, response.result]);
            setNewMessage('');
        } catch (error) {
            console.error('Failed to send message:', error);
        }
    };

    const filteredConversations = conversations.filter(conv =>
        conv.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conv.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="admin-chat-page">
            {/* Sidebar - Conversations List */}
            <div className="admin-chat-sidebar">
                <div className="admin-chat-sidebar-header">
                    <h2>{t('admin.chat.title')}</h2>
                </div>

                <div className="admin-chat-search">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder={t('admin.chat.search_placeholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="admin-chat-conversations">
                    {filteredConversations.length === 0 ? (
                        <div className="admin-chat-empty">
                            <MessageCircle size={48} />
                            <p>{t('admin.chat.no_conversations')}</p>
                        </div>
                    ) : (
                        filteredConversations.map((conv) => (
                            <div
                                key={conv.userId}
                                className={`admin-chat-conversation-item ${selectedUser?.userId === conv.userId ? 'active' : ''}`}
                                onClick={() => setSelectedUser(conv)}
                            >
                                <div className="admin-chat-conversation-avatar">
                                    {conv.username.charAt(0).toUpperCase()}
                                </div>
                                <div className="admin-chat-conversation-info">
                                    <div className="admin-chat-conversation-name">
                                        {conv.username}
                                        {conv.unreadCount > 0 && (
                                            <span className="admin-chat-unread-badge">{conv.unreadCount}</span>
                                        )}
                                    </div>
                                    <div className="admin-chat-conversation-preview">
                                        {conv.lastMessage?.content || t('admin.chat.no_messages_preview')}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="admin-chat-main">
                {selectedUser ? (
                    <>
                        {/* Chat Header */}
                        <div className="admin-chat-header">
                            <div className="admin-chat-header-user">
                                <div className="admin-chat-header-avatar">
                                    {selectedUser.username.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div className="admin-chat-header-name">{selectedUser.username}</div>
                                    <div className="admin-chat-header-email">{selectedUser.email}</div>
                                </div>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="admin-chat-messages">
                            {isLoading ? (
                                <div className="admin-chat-loading">{t('admin.chat.loading')}</div>
                            ) : messages.length === 0 ? (
                                <div className="admin-chat-empty">
                                    <MessageCircle size={48} />
                                    <p>{t('admin.chat.no_messages')}</p>
                                </div>
                            ) : (
                                messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`admin-chat-message ${msg.toUserId === selectedUser.userId ? 'admin-chat-message-sent' : 'admin-chat-message-received'}`}
                                    >
                                        <div className="admin-chat-message-content">
                                            {msg.content}
                                        </div>
                                        <div className="admin-chat-message-time">
                                            {new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <form className="admin-chat-input-container" onSubmit={handleSendMessage}>
                            <input
                                type="text"
                                className="admin-chat-input"
                                placeholder={t('admin.chat.input_placeholder')}
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                            />
                            <button
                                type="submit"
                                className="admin-chat-send-button"
                                disabled={!newMessage.trim()}
                            >
                                <Send size={20} />
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="admin-chat-no-selection">
                        <MessageCircle size={64} />
                        <p>{t('admin.chat.select_conversation')}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminChatPage;
