
import { useState, useEffect } from 'react';
import {
    User,
    ClipboardList,
    ChevronDown,
    Eye,
    X,
    Star,
    MessageSquare,
    Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../../styles/pages/profile.css'; // Re-use profile styles
import userService from '../../api/userService';
import billService from '../../api/billService';
import bookCommentApi from '../../api/bookCommentApi';
import paymentApi from '../../api/paymentApi';
import { getCurrentUserId } from '../../utils/auth';
import { formatCurrency } from '../../utils/formatters';
import type { User as UserType } from '../../types/User';
import type { Bill } from '../../types/Bill';
import type { BookComment } from '../../types/BookComment';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

// ── Status badge helper ──────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { bg: string; color: string; border: string; label: string }> = {
    PENDING: { bg: '#FFF8E1', color: '#F57C00', border: '#FFE082', label: 'Chờ xác nhận' },
    APPROVED: { bg: '#E3F2FD', color: '#1565C0', border: '#90CAF9', label: 'Đã duyệt' },
    SHIPPING: { bg: '#FFF3E0', color: '#E65100', border: '#FFCC80', label: 'Đang giao' },
    SHIPPED: { bg: '#E8F5E9', color: '#2E7D32', border: '#A5D6A7', label: 'Đã giao' },
    COMPLETED: { bg: '#E8F5E9', color: '#1B5E20', border: '#66BB6A', label: 'Hoàn thành' },
    CANCELED: { bg: '#FFEBEE', color: '#B71C1C', border: '#EF9A9A', label: 'Đã hủy' },
};

const getStatusBadge = (status: string) => {
    const cfg = STATUS_CONFIG[status] ?? { bg: '#F5F5F5', color: '#555', border: '#DDD', label: status };
    return (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100px',
            fontSize: '11px',
            fontWeight: 700,
            padding: '4px 8px',
            borderRadius: '50px',
            backgroundColor: cfg.bg,
            color: cfg.color,
            border: `1px solid ${cfg.border}`,
            whiteSpace: 'nowrap',
            letterSpacing: '0.2px',
        }}>
            {cfg.label}
        </span>
    );
};
// ────────────────────────────────────────────────────────────────────────────

const MyOrdersPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const userId = getCurrentUserId();
    const [userData, setUserData] = useState<UserType | null>(null);
    const [orders, setOrders] = useState<Bill[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<Bill | null>(null);
    const [isOrderDetailOpen, setIsOrderDetailOpen] = useState(false);
    const [isOrderDetailLoading, setIsOrderDetailLoading] = useState(false);
    const [billReviews, setBillReviews] = useState<Record<number, BookComment>>({});

    // Review Modal State
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [reviewTarget, setReviewTarget] = useState<{ bookId: number, bookName: string, billId: number } | null>(null);
    const [reviewIdToEdit, setReviewIdToEdit] = useState<number | null>(null);
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewContent, setReviewContent] = useState('');
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);

    useEffect(() => {
        if (!userId) {
            navigate('/shop/login');
            return;
        }
        fetchUserData();
        fetchOrders();
    }, [userId]);

    const fetchUserData = async () => {
        try {
            const response = await userService.getOwnProfile();
            if (response.result) {
                setUserData(response.result);
            }
        } catch (error) {
            console.error('Failed to fetch user data:', error);
        }
    };

    const fetchOrders = async () => {
        try {
            const response = await billService.getOwnBills({ size: 50 });
            if (response.result) {
                setOrders(response.result.content);
            }
        } catch (error) {
            console.error('Failed to fetch orders:', error);
            toast.error(t('shop.load_error') || 'Không thể tải danh sách đơn hàng');
        } finally {
            setIsLoading(false);
        }
    };

    const handleViewOrderDetails = async (orderId: number) => {
        const existingOrder = orders.find(o => o.id === orderId);
        setSelectedOrder(existingOrder || { id: orderId } as Bill);
        setIsOrderDetailLoading(true);
        setIsOrderDetailOpen(true);

        try {
            const [billResponse, reviewsResponse] = await Promise.all([
                billService.getBillById(orderId),
                bookCommentApi.getCommentsByBill(orderId)
            ]);

            if (billResponse.result) {
                setSelectedOrder(billResponse.result);
            }

            if (reviewsResponse.result) {
                const reviewsMap: Record<number, BookComment> = {};
                reviewsResponse.result.forEach((r: BookComment) => {
                    reviewsMap[r.bookId] = r;
                });
                setBillReviews(reviewsMap);
            } else {
                setBillReviews({});
            }
        } catch (error) {
            console.error('Failed to fetch bill details:', error);
            toast.error(t('shop.load_error') || 'Không thể lấy chi tiết đơn hàng');
            setIsOrderDetailOpen(false);
        } finally {
            setIsOrderDetailLoading(false);
        }
    };

    const handlePayment = async (billId: number) => {
        try {
            const response = await paymentApi.createPayment(billId);
            if (response.result && response.result.url) {
                window.location.href = response.result.url;
            } else {
                toast.error(t('payment.create_error'));
            }
        } catch (error) {
            console.error("Payment creation failed", error);
            toast.error(t('payment.create_error'));
        }
    };

    const openReviewModal = (bookId: number, bookName: string, billId: number, existingReview?: BookComment) => {
        setReviewTarget({ bookId, bookName, billId });
        if (existingReview) {
            setReviewRating(existingReview.rating);
            setReviewContent(existingReview.comment);
            setReviewIdToEdit(existingReview.id);
        } else {
            setReviewRating(5);
            setReviewContent('');
            setReviewIdToEdit(null);
        }
        setIsReviewModalOpen(true);
    };

    const handleSubmitReview = async () => {
        if (!reviewTarget || !userId) return;

        if (!reviewContent.trim()) {
            toast.warning(t('profile.placeholder_comment'));
            return;
        }

        setIsSubmittingReview(true);
        try {
            if (reviewIdToEdit) {
                await bookCommentApi.updateComment(reviewIdToEdit, {
                    userId: userId,
                    bookId: reviewTarget.bookId,
                    billId: reviewTarget.billId,
                    rating: reviewRating,
                    content: reviewContent.trim()
                });
                toast.success(t('profile.save_changes'));
            } else {
                await bookCommentApi.createComment({
                    userId: userId,
                    bookId: reviewTarget.bookId,
                    billId: reviewTarget.billId,
                    rating: reviewRating,
                    content: reviewContent.trim()
                });
                toast.success(t('profile.submit_review'));
            }

            // Refresh reviews list for this bill
            const reviewsResponse = await bookCommentApi.getCommentsByBill(reviewTarget.billId);
            if (reviewsResponse.result) {
                const reviewsMap: Record<number, BookComment> = {};
                reviewsResponse.result.forEach((r: BookComment) => {
                    reviewsMap[r.bookId] = r;
                });
                setBillReviews(reviewsMap);
            }

            setIsReviewModalOpen(false);
        } catch (error: any) {
            console.error('Submit review error:', error);
            if (error.response?.data?.message) {
                toast.error(error.response.data.message);
            } else {
                toast.error(t('shop.error_message') || 'Không thể gửi đánh giá.');
            }
        } finally {
            setIsSubmittingReview(false);
        }
    };

    if (isLoading) {
        return (
            <div className="profile-loading" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f0f0' }}>
                <Loader2 className="animate-spin" size={48} color="#C92127" />
            </div>
        );
    }

    return (
        <div className="profile-page">
            <div className="shop-container">
                <div className="profile-layout">
                    {/* Sidebar */}
                    <aside className="profile-sidebar">
                        <div className="user-summary-card">
                            <div className="avatar-section-centered">
                                <div className="large-avatar-wrapper">
                                    <div className="avatar-circle">
                                        <User size={48} color="#ccd0d5" />
                                    </div>
                                </div>
                                <div className="user-info-centered">
                                    <h3>{userData?.firstName} {userData?.lastName}</h3>
                                </div>
                            </div>
                        </div>

                        <nav className="profile-nav">
                            <div className="nav-section">
                                <div className="nav-item" onClick={() => navigate('/shop/profile')}>
                                    <div className="nav-item-header">
                                        <div className="nav-item-wrapper">
                                            <User size={20} />
                                            <span>{t('profile.account_info')}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="nav-item active">
                                    <div className="nav-item-header">
                                        <div className="nav-item-wrapper">
                                            <ClipboardList size={20} />
                                            <span>{t('profile.my_orders')}</span>
                                        </div>
                                        <ChevronDown size={14} className="arrow" />
                                    </div>
                                </div>
                                <div className="nav-item" onClick={() => navigate('/shop/my-reviews')}>
                                    <div className="nav-item-header">
                                        <div className="nav-item-wrapper">
                                            <MessageSquare size={20} />
                                            <span>{t('profile.my_reviews')}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </nav>
                    </aside>

                    {/* Main Content */}
                    <main className="profile-main">
                        <div className="profile-form-section">
                            <h2 className="section-title">{t('profile.my_orders')}</h2>
                            <div className="orders-list">
                                {orders.length === 0 ? (
                                    <div className="empty-state" style={{ textAlign: 'center', padding: '40px' }}>
                                        <ClipboardList size={48} color="#ddd" style={{ marginBottom: '10px' }} />
                                        <p color="#666">{t('profile.no_orders')}</p>
                                    </div>
                                ) : (
                                    <div className="orders-table-wrapper" style={{ overflowX: 'auto' }}>
                                        <table className="orders-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr style={{ textAlign: 'left', borderBottom: '2px solid #f0f0f0' }}>
                                                    <th style={{ padding: '12px' }}>{t('profile.order_id')}</th>
                                                    <th style={{ padding: '12px' }}>{t('profile.order_date')}</th>
                                                    <th style={{ padding: '12px' }}>{t('profile.total_amount')}</th>
                                                    <th style={{ padding: '12px' }}>{t('profile.payment_status')}</th>
                                                    <th style={{ padding: '12px' }}>{t('profile.order_status')}</th>
                                                    <th style={{ padding: '12px' }}></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {orders.map(order => (
                                                    <tr key={order.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                                        <td style={{ padding: '12px', fontWeight: 600 }}>#{order.id}</td>
                                                        <td style={{ padding: '12px' }}>{order.createdAt ? new Date(order.createdAt).toLocaleDateString('vi-VN') : '---'}</td>
                                                        <td style={{ padding: '12px', color: '#C92127', fontWeight: 700 }}>{formatCurrency(order.totalCost)}</td>
                                                        <td style={{ padding: '12px' }}>
                                                            {order.paymentMethodName === 'VNPay' ? (
                                                                order.paymentStatus === 'SUCCESS' ? (
                                                                    <span style={{ color: '#1e7e34', fontWeight: 500 }}>{t('profile.paid')}</span>
                                                                ) : (
                                                                    <span style={{ color: '#f57c00', fontWeight: 500 }}>{t('profile.unpaid')}</span>
                                                                )
                                                            ) : (
                                                                <span style={{ color: '#666' }}>COD</span>
                                                            )}
                                                        </td>
                                                        <td style={{ padding: '12px' }}>
                                                            {getStatusBadge(order.status)}
                                                        </td>
                                                        <td style={{ padding: '12px', textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                            {order.paymentMethodName === 'VNPay' && order.paymentStatus === 'PENDING' && (
                                                                <button
                                                                    onClick={() => handlePayment(order.id)}
                                                                    style={{
                                                                        backgroundColor: '#005ba6',
                                                                        color: 'white',
                                                                        border: 'none',
                                                                        padding: '4px 8px',
                                                                        borderRadius: '4px',
                                                                        cursor: 'pointer',
                                                                        fontSize: '12px',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '4px'
                                                                    }}
                                                                    title={t('profile.pay_now')}
                                                                >
                                                                    {t('profile.pay_now')}
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => handleViewOrderDetails(order.id)}
                                                                style={{ background: 'none', border: '1px solid #ddd', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
                                                                title={t('profile.view_detail')}
                                                            >
                                                                <Eye size={14} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </main>
                </div>
            </div>

            {/* Order Detail Modal */}
            {isOrderDetailOpen && selectedOrder && (
                <div className="modal-backdrop" onClick={() => setIsOrderDetailOpen(false)}>
                    <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
                        <div className="modal-header">
                            <h3>{t('profile.order_detail_title', { id: selectedOrder.id })}</h3>
                            <button className="btn-close-modal" onClick={() => setIsOrderDetailOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            {isOrderDetailLoading ? (
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '60px 0' }}>
                                    <Loader2 className="animate-spin" size={40} color="#C92127" />
                                </div>
                            ) : (
                                <>
                                    <div className="order-detail-info">
                                <div className="info-column">
                                    <h4>{t('profile.customer_info')}</h4>
                                    <div className="info-item">
                                        <span className="info-label">{t('profile.recipient')}</span>
                                        <span className="info-value">{selectedOrder.fullName || selectedOrder.userName}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">{t('profile.phone')}</span>
                                        <span className="info-value">{selectedOrder.phone || 'N/A'}</span>
                                    </div>
                                </div>
                                <div className="info-column">
                                    <h4>{t('profile.payment_shipping_info')}</h4>
                                    <div className="info-item">
                                        <span className="info-label">{t('profile.order_status')}:</span>
                                        <span className="info-value" style={{ paddingTop: '2px', display: 'flex', alignItems: 'center' }}>
                                            {getStatusBadge(selectedOrder.status)}
                                        </span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">{t('profile.total_amount')}:</span>
                                        <span className="info-value text-red">{formatCurrency(selectedOrder.totalCost)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="detail-books-section" style={{ marginTop: '20px' }}>
                                <h4>{t('profile.products_purchased')}</h4>
                                <table className="detail-books-table">
                                    <thead>
                                        <tr>
                                            <th>{t('profile.product')}</th>
                                            <th>{t('profile.unit_price')}</th>
                                            <th>{t('profile.quantity')}</th>
                                            <th style={{ textAlign: 'right' }}>{t('profile.into_money')}</th>
                                            {selectedOrder.status === 'COMPLETED' || selectedOrder.status === 'SHIPPED' && <th></th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedOrder.books?.map((book, index) => (
                                            <tr key={index}>
                                                <td>
                                                    <div className="detail-book-item">
                                                        <img src={book.bookImageUrl} alt={book.bookName} className="detail-book-img" />
                                                        <span className="detail-book-name">{book.bookName}</span>
                                                    </div>
                                                </td>
                                                <td>{formatCurrency(book.priceSnapshot)}</td>
                                                <td>{book.quantity}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                                    {formatCurrency(book.subtotal || (book.priceSnapshot * book.quantity))}
                                                </td>

                                                {selectedOrder.status === 'COMPLETED' || selectedOrder.status === 'SHIPPED' && (
                                                    <td style={{ textAlign: 'right' }}>
                                                        <button
                                                            className="btn-review-action"
                                                            onClick={() => openReviewModal(book.bookId, book.bookName, selectedOrder.id, billReviews[book.bookId])}
                                                            style={{
                                                                backgroundColor: billReviews[book.bookId] ? '#1976d2' : '#F69113',
                                                                color: 'white',
                                                                border: 'none',
                                                                padding: '4px 8px',
                                                                borderRadius: '4px',
                                                                cursor: 'pointer',
                                                                fontSize: '12px'
                                                            }}
                                                        >
                                                            {billReviews[book.bookId] ? t('profile.edit_review_action') : t('profile.review_action')}
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Review Modal */}
            {isReviewModalOpen && reviewTarget && (
                <div className="modal-backdrop" onClick={() => setIsReviewModalOpen(false)}>
                    <div className="modal-container review-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h3>{t('profile.review_modal_title')}</h3>
                            <button className="btn-close-modal" onClick={() => setIsReviewModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="review-product-info" style={{ marginBottom: '16px', fontWeight: '600' }}>
                                {reviewTarget.bookName}
                            </div>

                            <div className="review-rating-input" style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                                {[1, 2, 3, 4, 5].map(star => (
                                    <Star
                                        key={star}
                                        size={32}
                                        fill={star <= reviewRating ? "#F69113" : "none"}
                                        color={star <= reviewRating ? "#F69113" : "#ddd"}
                                        style={{ cursor: 'pointer', margin: '0 4px' }}
                                        onClick={() => setReviewRating(star)}
                                    />
                                ))}
                            </div>

                            <div className="review-content-input">
                                <label style={{ display: 'block', marginBottom: '8px' }}>{t('profile.your_comment')}</label>
                                <textarea
                                    value={reviewContent}
                                    onChange={(e) => setReviewContent(e.target.value)}
                                    rows={5}
                                    placeholder={t('profile.placeholder_comment')}
                                    style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '4px', resize: 'vertical' }}
                                ></textarea>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-modal-secondary" onClick={() => setIsReviewModalOpen(false)} style={{ marginRight: '10px', padding: '8px 16px', background: '#f0f0f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>{t('profile.cancel')}</button>
                            <button
                                className="btn-modal-primary"
                                onClick={handleSubmitReview}
                                disabled={isSubmittingReview}
                                style={{ padding: '8px 16px', background: '#C92127', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', opacity: isSubmittingReview ? 0.7 : 1 }}
                            >
                                {isSubmittingReview ? t('profile.submitting') : (reviewIdToEdit ? t('profile.update_review') : t('profile.submit_review'))}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyOrdersPage;
