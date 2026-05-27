import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MessageCircle } from 'lucide-react';
import chatService from '../../api/chatService';
import type { ConversationUser } from '../../types/Chat';
import '../../styles/pages/admin-chat-list.css';
import { useTranslation } from 'react-i18next';

const AdminChatListPage: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [conversations, setConversations] = useState<ConversationUser[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadConversations();
    }, []);

    const loadConversations = async () => {
        setIsLoading(true);
        try {
            const response = await chatService.getConversations();
            if (response.code === 1000) {
                setConversations(response.result || []);
            }
        } catch (error) {
            console.error('Failed to load conversations:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredConversations = conversations.filter(conv =>
        conv.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conv.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelectUser = (userId: number) => {
        navigate(`/admin/chat/${userId}`);
    };

    return (
        <div className="admin-chat-list-page">
            <div className="admin-chat-list-header">
                <h1>{t('admin.chat.title')}</h1>
                <p>{t('admin.chat.subtitle')}</p>
            </div>

            <div className="admin-chat-list-search">
                <Search size={20} />
                <input
                    type="text"
                    placeholder={t('admin.chat.search_placeholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="admin-chat-list-container">
                {isLoading ? (
                    <div className="admin-chat-list-loading">{t('admin.chat.loading')}</div>
                ) : filteredConversations.length === 0 ? (
                    <div className="admin-chat-list-empty">
                        <MessageCircle size={64} />
                        <p>{t('admin.chat.no_conversations')}</p>
                    </div>
                ) : (
                    <div className="admin-chat-list-grid">
                        {filteredConversations.map((conv) => (
                            <div
                                key={conv.userId}
                                className={`admin-chat-list-item ${conv.unreadCount > 0 ? 'unread' : ''}`}
                                onClick={() => handleSelectUser(conv.userId)}
                            >
                                <div className="admin-chat-list-item-avatar">
                                    {conv.username.charAt(0).toUpperCase()}
                                </div>
                                <div className="admin-chat-list-item-info">
                                    <div className="admin-chat-list-item-name">
                                        {conv.username}
                                        {/* {conv.email} - Comment out email to look cleaner like Messenger */}
                                    </div>
                                    <div className="admin-chat-list-item-preview">
                                        {conv.unreadCount > 0 ? (
                                            <strong>{conv.lastMessage?.content || t('admin.chat.no_messages_preview')}</strong>
                                        ) : (
                                            conv.lastMessage?.content || t('admin.chat.no_messages_preview')
                                        )}
                                        <span style={{ margin: '0 4px' }}>·</span>
                                        <span style={{ fontSize: '12px' }}>
                                            {conv.lastMessage?.createdAt ? new Date(conv.lastMessage.createdAt).toLocaleDateString('vi-VN') : ''}
                                        </span>
                                    </div>
                                </div>
                                {conv.unreadCount > 0 && (
                                    <div className="admin-chat-list-item-badge">
                                        {conv.unreadCount}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminChatListPage;
