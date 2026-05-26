import React, { useState, useRef, useEffect } from 'react';
import {
    X, Send, Loader2, Bot, User, Shield,
    ChevronRight, AlertCircle, PhoneCall,
} from 'lucide-react';
import { useChatbot } from '../../context/ChatbotContext';
import type { ChatMessageDTO, BookSuggestion } from '../../api/chatbotService';
import './chatbot-widget.css';

// ── Sub-components ─────────────────────────────────────────────────────────

/** Bubble tin nhắn đơn lẻ */
const MessageBubble: React.FC<{ msg: ChatMessageDTO }> = ({ msg }) => {
    const isBot = msg.role === 'ASSISTANT';
    const isSystem = msg.role === 'SYSTEM';
    const isUser = msg.role === 'USER';

    if (isSystem) {
        return (
            <div className="cw-system-notice">
                <Shield size={14} />
                <span>{msg.content}</span>
            </div>
        );
    }

    // Parse metadata cho quick reply và product card
    let metadata: any = {};
    try {
        if (msg.metadata) metadata = JSON.parse(msg.metadata);
    } catch (_) {}

    return (
        <div className={`cw-message ${isBot ? 'cw-message--bot' : 'cw-message--user'}`}>
            {isBot && (
                <div className="cw-avatar cw-avatar--bot">
                    <Bot size={14} />
                </div>
            )}
            <div className="cw-bubble-wrapper">
                <div className="cw-bubble">
                    {msg.content}
                    {msg.contentType === 'PRODUCT_CARD' && metadata.products && Array.isArray(metadata.products) && (
                        <div className="cw-product-cards" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                            {(metadata.products as BookSuggestion[]).map((book: BookSuggestion) => (
                                <BookCard key={book.id} book={book} />
                            ))}
                        </div>
                    )}
                </div>
                <div className="cw-message-meta">
                    <span className="cw-time">
                        {new Date(
                            msg.createdAt.endsWith('Z') ? msg.createdAt : msg.createdAt + 'Z'
                        ).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: 'Asia/Ho_Chi_Minh',
                        })}
                    </span>
                    {isBot && msg.aiConfidence != null && msg.aiConfidence < 0.7 && (
                        <span className="cw-low-confidence">⚠ Độ chắc chắn thấp</span>
                    )}
                </div>
            </div>
            {isUser && (
                <div className="cw-avatar cw-avatar--user">
                    <User size={14} />
                </div>
            )}
        </div>
    );
};

/** Quick reply buttons */
const QuickReplies: React.FC<{
    options: string[];
    onSelect: (opt: string) => void;
    disabled?: boolean;
}> = ({ options, onSelect, disabled }) => (
    <div className="cw-quick-replies">
        {options.map((opt, i) => (
            <button
                key={i}
                className="cw-quick-reply-btn"
                onClick={() => onSelect(opt)}
                disabled={disabled}
            >
                {opt} <ChevronRight size={12} />
            </button>
        ))}
    </div>
);

/** Card gợi ý sách */
const BookCard: React.FC<{ book: BookSuggestion }> = ({ book }) => (
    <a
        href={`/shop/book-detail/${book.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="cw-book-card"
    >
        <img
            src={book.bookImageUrl || '/placeholder-book.png'}
            alt={book.name}
            className="cw-book-img"
            onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-book.png'; }}
        />
        <div className="cw-book-info">
            <p className="cw-book-name">{book.name}</p>
            <p className="cw-book-price">
                {book.finalPrice?.toLocaleString('vi-VN')}đ
                {book.sale > 0 && <span className="cw-book-sale">-{book.sale}%</span>}
            </p>
            {book.stock <= 5 && book.stock > 0 && (
                <p className="cw-book-stock">⚡ Còn {book.stock} cuốn</p>
            )}
        </div>
    </a>
);

const EscalationBanner: React.FC<{
    onAccept: () => void;
    onDismiss: () => void;
}> = ({ onAccept, onDismiss }) => {
    return (
        <div className="cw-escalation-banner">
            <PhoneCall className="cw-escalation-icon" size={18} />
            <span className="cw-escalation-text">Bot có vẻ chưa giải quyết được vấn đề. Bạn có muốn chat với Admin?</span>
            <div className="cw-escalation-actions">
                <button className="cw-btn cw-btn--primary" onClick={onAccept}>Có, gặp Admin</button>
                <button className="cw-btn cw-btn--ghost" onClick={onDismiss}>Không cần</button>
            </div>
        </div>
    );
};

// ── Main Widget ────────────────────────────────────────────────────────────

const ChatbotWidget: React.FC = () => {
    const {
        isOpen, isLoading, isSending,
        messages, suggestEscalation, escalation, error,
        unreadCount, openWidget, closeWidget,
        sendMessage, dismissEscalation,
    } = useChatbot();

    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Lắng nghe sự kiện để tự động ẩn chatbot khi mở admin chat
    useEffect(() => {
        const handleClose = () => {
            if (isOpen) closeWidget();
        };
        window.addEventListener('close-chatbot', handleClose);
        return () => window.removeEventListener('close-chatbot', handleClose);
    }, [isOpen, closeWidget]);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Focus input khi mở
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen]);

    const handleSend = async (content?: string) => {
        const text = (content ?? inputValue).trim();
        if (!text || isSending) return;
        setInputValue('');
        await sendMessage(text);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Lấy quick replies từ tin nhắn cuối của bot
    const lastBotMsg = [...messages].reverse().find(m => m.role === 'ASSISTANT');
    let quickReplyOptions: string[] = [];
    if (lastBotMsg?.contentType === 'QUICK_REPLY' && lastBotMsg.metadata) {
        try {
            const parsed = JSON.parse(lastBotMsg.metadata);
            quickReplyOptions = parsed.options || [];
        } catch (_) {}
    }

    const handleMeetAdmin = () => {
        const adminChatBtn = document.querySelector('.chat-widget-button') as HTMLButtonElement;
        if (adminChatBtn) {
            closeWidget();
            adminChatBtn.click();
        } else {
            alert('Vui lòng đăng nhập để có thể chat trực tiếp với Admin.');
            window.location.href = '/login';
        }
    };

    return (
        <>
            {/* FAB Button */}
            <button
                id="chatbot-fab-btn"
                className={`cw-fab ${isOpen ? 'cw-fab--hidden' : ''}`}
                onClick={openWidget}
                aria-label="Mở chatbot BookBot"
            >
                <div className="cw-fab-icon">
                    <Bot size={26} />
                </div>
                {unreadCount > 0 && (
                    <span className="cw-fab-badge">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
                <span className="cw-fab-tooltip">BookBot hỗ trợ bạn!</span>
            </button>

            {/* Chat Window */}
            <div className={`cw-window ${isOpen ? 'cw-window--open' : ''}`} id="chatbot-window">
                {/* Header */}
                <div className="cw-header">
                    <div className="cw-header-left">
                        <div className="cw-header-avatar">
                            <Bot size={18} />
                        </div>
                        <div>
                            <div className="cw-header-name">BookBot</div>
                            <div className="cw-header-status">
                                <span className="cw-status-dot" />
                                {escalation ? 'Admin đang hỗ trợ' : 'Trợ lý AI BookLand'}
                            </div>
                        </div>
                    </div>
                    <button
                        className="cw-close-btn"
                        onClick={closeWidget}
                        aria-label="Đóng chatbot"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Messages area */}
                <div className="cw-messages" id="chatbot-messages">
                    {isLoading && messages.length === 0 && (
                        <div className="cw-loading">
                            <Loader2 size={28} className="cw-spin" />
                            <p>Đang kết nối...</p>
                        </div>
                    )}

                    {messages.map((msg, idx) => (
                        <MessageBubble key={msg.id ?? idx} msg={msg} />
                    ))}

                    {/* Quick reply buttons (chỉ hiện khi không đang gửi) */}
                    {quickReplyOptions.length > 0 && !isSending && (
                        <QuickReplies
                            options={quickReplyOptions}
                            onSelect={(opt) => handleSend(opt)}
                            disabled={isSending}
                        />
                    )}

                    {/* Bot typing indicator */}
                    {isSending && (
                        <div className="cw-message cw-message--bot">
                            <div className="cw-avatar cw-avatar--bot">
                                <Bot size={14} />
                            </div>
                            <div className="cw-typing">
                                <span /><span /><span />
                            </div>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="cw-error-notice">
                            <AlertCircle size={14} /> {error}
                        </div>
                    )}

                    {/* Escalation banner */}
                    {suggestEscalation && !escalation && (
                        <EscalationBanner
                            onAccept={handleMeetAdmin}
                            onDismiss={dismissEscalation}
                        />
                    )}

                    {/* Escalation success */}
                    {escalation && (
                        <div className="cw-escalation-success">
                            ✅ Đã chuyển sang chế độ Admin.
                            <br />Vui lòng kiểm tra cửa sổ chat bên cạnh.
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="cw-input-area">
                    <input
                        ref={inputRef}
                        id="chatbot-input"
                        className="cw-input"
                        type="text"
                        placeholder={
                            escalation
                                ? 'Admin đang xử lý yêu cầu của bạn...'
                                : 'Nhập tin nhắn...'
                        }
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isSending || !!escalation}
                        maxLength={500}
                    />
                    <button
                        id="chatbot-send-btn"
                        className="cw-send-btn"
                        onClick={() => handleSend()}
                        disabled={!inputValue.trim() || isSending || !!escalation}
                        aria-label="Gửi tin nhắn"
                    >
                        {isSending ? <Loader2 size={18} className="cw-spin" /> : <Send size={18} />}
                    </button>
                </div>

                {/* Footer */}
                <div className="cw-footer">
                    Powered by BookBot AI · <button className="cw-footer-link" onClick={handleMeetAdmin}>Gặp admin</button>
                </div>
            </div>
        </>
    );
};

export default ChatbotWidget;
// trigger build
