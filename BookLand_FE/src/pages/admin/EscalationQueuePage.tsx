import React, { useState, useEffect } from 'react';
import {
    AlertCircle, Clock, CheckCircle, MessageCircle,
    Loader2, RefreshCw, Shield,
} from 'lucide-react';
import chatbotService, { type EscalationResponse } from '../../api/chatbotService';
import { useWebSocket } from '../../context/WebSocketContext';
import './escalation-queue.css';

const PRIORITY_LABEL: Record<string, string> = {
    HIGH: '🔴 Cao',
    MEDIUM: '🟡 Trung bình',
    LOW: '🟢 Thấp',
};

const CATEGORY_LABEL: Record<string, string> = {
    PRODUCT_ADVICE: '📚 Tư vấn SP',
    COMPLAINT: '😤 Khiếu nại',
    ORDER_INQUIRY: '📦 Đơn hàng',
    PAYMENT: '💳 Thanh toán',
    SHIPPING: '🚚 Giao hàng',
    ADMIN_REQUEST: '👋 Gặp admin',
    OTHER: '❓ Khác',
};

const STATUS_LABEL: Record<string, string> = {
    PENDING: 'Đang chờ',
    ASSIGNED: 'Đang xử lý',
    RESOLVED: 'Đã giải quyết',
    CLOSED: 'Đã đóng',
};

const EscalationQueuePage: React.FC = () => {
    const [escalations, setEscalations] = useState<EscalationResponse[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [activeStatus, setActiveStatus] = useState<'PENDING' | 'ASSIGNED' | 'RESOLVED'>('PENDING');
    const [selectedEscalation, setSelectedEscalation] = useState<EscalationResponse | null>(null);
    const { subscribe, isConnected } = useWebSocket();

    useEffect(() => {
        loadQueue(activeStatus);
    }, [activeStatus]);

    // WebSocket: nhận escalation mới realtime
    useEffect(() => {
        if (!isConnected) return;
        const unsub = subscribe('/topic/escalations', (msg) => {
            try {
                const newEsc: EscalationResponse = JSON.parse(msg.body);
                if (activeStatus === 'PENDING') {
                    setEscalations(prev => [newEsc, ...prev]);
                }
            } catch (_) {}
        });
        return unsub;
    }, [isConnected, activeStatus]);

    const loadQueue = async (status: string) => {
        setIsLoading(true);
        try {
            const result = await chatbotService.getEscalationQueue(status, 0, 50);
            setEscalations(result.content || []);
        } catch (err) {
            console.error('Failed to load escalation queue:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAssign = async (id: string) => {
        try {
            const updated = await chatbotService.assignEscalation(id);
            setEscalations(prev => prev.filter(e => e.id !== id));
            setSelectedEscalation(updated);
            loadQueue('ASSIGNED');
        } catch (err) {
            console.error('Failed to assign escalation:', err);
        }
    };

    const handleResolve = async (id: string) => {
        try {
            await chatbotService.resolveEscalation(id);
            setEscalations(prev => prev.filter(e => e.id !== id));
            setSelectedEscalation(null);
        } catch (err) {
            console.error('Failed to resolve escalation:', err);
        }
    };

    const waitTime = (createdAt: string) => {
        const mins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
        if (mins < 1) return 'Vừa xong';
        if (mins < 60) return `${mins} phút`;
        return `${Math.floor(mins / 60)} giờ ${mins % 60} phút`;
    };

    return (
        <div className="eq-page">
            {/* Sidebar: Queue list */}
            <div className="eq-sidebar">
                <div className="eq-sidebar-header">
                    <h2 className="eq-title">
                        <AlertCircle size={20} />
                        Yêu cầu hỗ trợ
                    </h2>
                    <button
                        className="eq-refresh-btn"
                        onClick={() => loadQueue(activeStatus)}
                        disabled={isLoading}
                    >
                        <RefreshCw size={15} className={isLoading ? 'eq-spin' : ''} />
                    </button>
                </div>

                {/* Status tabs */}
                <div className="eq-tabs">
                    {(['PENDING', 'ASSIGNED', 'RESOLVED'] as const).map(s => (
                        <button
                            key={s}
                            className={`eq-tab ${activeStatus === s ? 'eq-tab--active' : ''}`}
                            onClick={() => setActiveStatus(s)}
                        >
                            {STATUS_LABEL[s]}
                        </button>
                    ))}
                </div>

                {/* List */}
                <div className="eq-list">
                    {isLoading && (
                        <div className="eq-loading">
                            <Loader2 size={24} className="eq-spin" />
                        </div>
                    )}
                    {!isLoading && escalations.length === 0 && (
                        <div className="eq-empty">
                            <CheckCircle size={40} />
                            <p>Không có yêu cầu nào</p>
                        </div>
                    )}
                    {escalations.map(esc => (
                        <div
                            key={esc.id}
                            className={`eq-item ${selectedEscalation?.id === esc.id ? 'eq-item--active' : ''} ${esc.priority === 'HIGH' ? 'eq-item--high' : ''}`}
                            onClick={() => setSelectedEscalation(esc)}
                        >
                            <div className="eq-item-top">
                                <div className="eq-item-avatar">
                                    {esc.username?.charAt(0).toUpperCase() || 'G'}
                                </div>
                                <div className="eq-item-info">
                                    <div className="eq-item-name">
                                        {esc.username || 'Guest'}
                                        {!esc.userId && <span className="eq-guest-badge">Guest</span>}
                                    </div>
                                    <div className="eq-item-category">
                                        {CATEGORY_LABEL[esc.category] || esc.category}
                                    </div>
                                </div>
                                <div className="eq-item-right">
                                    <span className="eq-item-priority">{PRIORITY_LABEL[esc.priority]}</span>
                                    <div className="eq-item-time">
                                        <Clock size={10} />
                                        {waitTime(esc.createdAt)}
                                    </div>
                                </div>
                            </div>
                            {esc.lastMessagePreview && (
                                <p className="eq-item-preview">{esc.lastMessagePreview}</p>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Detail panel */}
            <div className="eq-detail">
                {!selectedEscalation ? (
                    <div className="eq-detail-empty">
                        <MessageCircle size={56} />
                        <p>Chọn một yêu cầu để xem chi tiết</p>
                    </div>
                ) : (
                    <>
                        {/* Detail header */}
                        <div className="eq-detail-header">
                            <div className="eq-detail-user">
                                <div className="eq-detail-avatar">
                                    {selectedEscalation.username?.charAt(0).toUpperCase() || 'G'}
                                </div>
                                <div>
                                    <div className="eq-detail-username">{selectedEscalation.username || 'Guest'}</div>
                                    <div className="eq-detail-meta">
                                        {CATEGORY_LABEL[selectedEscalation.category]} ·{' '}
                                        {PRIORITY_LABEL[selectedEscalation.priority]} ·{' '}
                                        Chờ {waitTime(selectedEscalation.createdAt)}
                                    </div>
                                </div>
                            </div>
                            <div className="eq-detail-actions">
                                {selectedEscalation.status === 'PENDING' && (
                                    <button
                                        className="eq-btn eq-btn--primary"
                                        onClick={() => handleAssign(selectedEscalation.id)}
                                    >
                                        Nhận xử lý
                                    </button>
                                )}
                                {selectedEscalation.status === 'ASSIGNED' && (
                                    <button
                                        className="eq-btn eq-btn--success"
                                        onClick={() => handleResolve(selectedEscalation.id)}
                                    >
                                        <CheckCircle size={15} /> Đóng case
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* AI Summary */}
                        {selectedEscalation.aiSummary && (
                            <div className="eq-ai-panel">
                                <div className="eq-ai-section">
                                    <div className="eq-ai-label">
                                        <Shield size={14} /> Tóm tắt AI
                                    </div>
                                    <p className="eq-ai-content">{selectedEscalation.aiSummary}</p>
                                </div>
                                {selectedEscalation.aiSuggestion && (
                                    <div className="eq-ai-section">
                                        <div className="eq-ai-label">💡 Gợi ý trả lời</div>
                                        <p className="eq-ai-content">{selectedEscalation.aiSuggestion}</p>
                                        <button
                                            className="eq-copy-btn"
                                            onClick={() => navigator.clipboard.writeText(selectedEscalation.aiSuggestion!)}
                                        >
                                            📋 Copy
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Basic info */}
                        <div className="eq-info-grid">
                            <div className="eq-info-item">
                                <span className="eq-info-label">Mã yêu cầu</span>
                                <span className="eq-info-value">#{selectedEscalation.id.substring(0, 8).toUpperCase()}</span>
                            </div>
                            <div className="eq-info-item">
                                <span className="eq-info-label">Session ID</span>
                                <span className="eq-info-value">{selectedEscalation.sessionId.substring(0, 8)}...</span>
                            </div>
                            <div className="eq-info-item">
                                <span className="eq-info-label">Lý do</span>
                                <span className="eq-info-value">{selectedEscalation.reason}</span>
                            </div>
                            <div className="eq-info-item">
                                <span className="eq-info-label">Số tin nhắn</span>
                                <span className="eq-info-value">{selectedEscalation.messageCount}</span>
                            </div>
                            {selectedEscalation.adminName && (
                                <div className="eq-info-item">
                                    <span className="eq-info-label">Admin xử lý</span>
                                    <span className="eq-info-value">{selectedEscalation.adminName}</span>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default EscalationQueuePage;
