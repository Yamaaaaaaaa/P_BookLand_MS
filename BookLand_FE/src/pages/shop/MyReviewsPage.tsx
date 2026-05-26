
import { useState, useEffect } from 'react';
import {
    User,
    ClipboardList,
    ChevronDown,
    Star,
    MessageSquare,
    Loader2,
    Trash2,
    Edit
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../../styles/pages/profile.css'; // Re-use profile styles
import userService from '../../api/userService';
import bookCommentApi from '../../api/bookCommentApi';
import { getCurrentUserId } from '../../utils/auth';
import type { User as UserType } from '../../types/User';
import type { BookComment } from '../../types/BookComment';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

const MyReviewsPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const userId = getCurrentUserId();
    const [userData, setUserData] = useState<UserType | null>(null);
    const [reviews, setReviews] = useState<BookComment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingReview, setEditingReview] = useState<BookComment | null>(null);
    const [editRating, setEditRating] = useState(5);
    const [editContent, setEditContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!userId) {
            navigate('/shop/login');
            return;
        }
        fetchUserData();
        fetchReviews();
    }, [userId, page]);

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

    const fetchReviews = async () => {
        setIsLoading(true);
        try {
            const response = await bookCommentApi.getCommentsByUser({ page, size: 10, sortBy: 'createdAt', sortDirection: 'DESC' });
            if (response.result) {
                // Backend returns a flat list (BookComment[]), not a Page object
                const reviewsList = Array.isArray(response.result) ? response.result : (response.result as any).content || [];
                setReviews(reviewsList);
                // Since it's a flat list, we might not have totalPages from backend. 
                // Default to 1 or calculate based on list length if we were doing client side pagination.
                // For now, if backend ignores page params, we just show what we got.
                setTotalPages(1);
            }
        } catch (error) {
            console.error('Failed to fetch reviews:', error);
            toast.error(t('shop.load_error') || 'Không thể tải đánh giá của bạn');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteReview = async (reviewId: number) => {
        if (window.confirm(t('profile.delete_confirm'))) {
            try {
                // Determine if we should use admin or user endpoint. 
                // Since this is "My Reviews", usually it's the user deleting their own.
                // Assuming backend has an endpoint for user to delete their own, OR we use the generic delete if permissible.
                // API implementation showed: DELETE /book-comments/user/{id} for user to delete their own.
                await bookCommentApi.deleteComment(reviewId);
                toast.success(t('profile.delete_success'));
                fetchReviews(); // Refresh list
            } catch (error) {
                console.error('Failed to delete review:', error);
                toast.error(t('profile.delete_error'));
            }
        }
    };

    const openEditModal = (review: BookComment) => {
        setEditingReview(review);
        setEditRating(review.rating);
        setEditContent(review.comment);
        setIsEditModalOpen(true);
    };

    const handleUpdateReview = async () => {
        if (!editingReview) return;
        if (!editContent.trim()) {
            toast.warning(t('profile.placeholder_comment'));
            return;
        }

        setIsSubmitting(true);
        try {
            await bookCommentApi.updateComment(editingReview.id, {
                rating: editRating,
                content: editContent.trim(),
                userId: editingReview.userId,
                bookId: editingReview.bookId,
                billId: editingReview.billId
            });
            toast.success(t('profile.save_changes'));
            setIsEditModalOpen(false);
            fetchReviews();
        } catch (error) {
            console.error('Failed to update review:', error);
            toast.error(t('profile.delete_error')); // Reuse generic error or add specific one
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading && page === 1) {
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
                                <div className="nav-item" onClick={() => navigate('/shop/my-orders')}>
                                    <div className="nav-item-header">
                                        <div className="nav-item-wrapper">
                                            <ClipboardList size={20} />
                                            <span>{t('profile.my_orders')}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="nav-item active">
                                    <div className="nav-item-header">
                                        <div className="nav-item-wrapper">
                                            <MessageSquare size={20} />
                                            <span>{t('profile.my_reviews')}</span>
                                        </div>
                                        <ChevronDown size={14} className="arrow" />
                                    </div>
                                </div>
                            </div>
                        </nav>
                    </aside>

                    {/* Main Content */}
                    <main className="profile-main">
                        <div className="profile-form-section">
                            <h2 className="section-title">{t('profile.my_reviews')}</h2>

                            {reviews?.length === 0 ? (
                                <div className="empty-state" style={{ textAlign: 'center', padding: '40px' }}>
                                    <MessageSquare size={48} color="#ddd" style={{ marginBottom: '10px' }} />
                                    <p color="#666">{t('profile.no_reviews')}</p>
                                </div>
                            ) : (
                                <div className="reviews-list-container">
                                    {reviews.map(review => (
                                        <div key={review.id} className="user-review-item" style={{
                                            borderBottom: '1px solid #f0f0f0',
                                            padding: '20px 0',
                                            display: 'flex',
                                            gap: '20px'
                                        }}>
                                            <div className="review-book-info" style={{ width: '200px', flexShrink: 0 }}>
                                                <div style={{ fontWeight: 600, color: '#333', marginBottom: '4px' }}>{review.bookTitle}</div>
                                                <div style={{ fontSize: '12px', color: '#888' }}>{t('profile.order_id')}: #{review.billId}</div>
                                            </div>

                                            <div className="review-content-wrapper" style={{ flex: 1 }}>
                                                <div className="review-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                    <div className="review-rating">
                                                        {[...Array(5)].map((_, i) => (
                                                            <Star
                                                                key={i}
                                                                size={14}
                                                                fill={i < review.rating ? "#F69113" : "none"}
                                                                color={i < review.rating ? "#F69113" : "#ddd"}
                                                            />
                                                        ))}
                                                    </div>
                                                    <div className="review-date" style={{ fontSize: '12px', color: '#999' }}>
                                                        {new Date(review.createdAt).toLocaleDateString('vi-VN')}
                                                    </div>
                                                </div>
                                                <div className="review-text" style={{ color: '#444', lineHeight: '1.5' }}>
                                                    {review.comment}
                                                </div>
                                                <div className="review-actions" style={{ marginTop: '12px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                                    <button
                                                        onClick={() => openEditModal(review)}
                                                        style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: '#1976d2', cursor: 'pointer', fontSize: '13px' }}
                                                    >
                                                        <Edit size={14} /> {t('profile.edit')}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteReview(review.id)}
                                                        style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: '#d32f2f', cursor: 'pointer', fontSize: '13px' }}
                                                    >
                                                        <Trash2 size={14} /> {t('profile.delete')}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Pagination */}
                                    {totalPages > 1 && (
                                        <div className="pagination" style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                                <button
                                                    key={p}
                                                    className={`page-btn ${page === p ? 'active' : ''}`}
                                                    onClick={() => setPage(p)}
                                                    style={{
                                                        padding: '6px 12px',
                                                        border: page === p ? 'none' : '1px solid #ddd',
                                                        background: page === p ? '#C92127' : 'white',
                                                        color: page === p ? 'white' : '#333',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    {p}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </main>
                </div>
            </div>

            {/* Edit Modal */}
            {isEditModalOpen && (
                <div className="modal-backdrop" onClick={() => setIsEditModalOpen(false)}>
                    <div className="modal-container review-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h3>{t('profile.edit_review_title')}</h3>
                            <button className="btn-close-modal" onClick={() => setIsEditModalOpen(false)}>
                                {/* Close Icon or use Text */}
                                <span>×</span>
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="review-product-info" style={{ marginBottom: '16px', fontWeight: '600' }}>
                                {editingReview?.bookTitle}
                            </div>

                            <div className="review-rating-input" style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                                {[1, 2, 3, 4, 5].map(star => (
                                    <Star
                                        key={star}
                                        size={32}
                                        fill={star <= editRating ? "#F69113" : "none"}
                                        color={star <= editRating ? "#F69113" : "#ddd"}
                                        style={{ cursor: 'pointer', margin: '0 4px' }}
                                        onClick={() => setEditRating(star)}
                                    />
                                ))}
                            </div>

                            <div className="review-content-input">
                                <label style={{ display: 'block', marginBottom: '8px' }}>{t('profile.your_comment')}</label>
                                <textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    rows={5}
                                    style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '4px', resize: 'vertical' }}
                                ></textarea>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-modal-secondary" onClick={() => setIsEditModalOpen(false)} style={{ marginRight: '10px', padding: '8px 16px', background: '#f0f0f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>{t('profile.cancel')}</button>
                            <button
                                className="btn-modal-primary"
                                onClick={handleUpdateReview}
                                disabled={isSubmitting}
                                style={{ padding: '8px 16px', background: '#C92127', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', opacity: isSubmitting ? 0.7 : 1 }}
                            >
                                {isSubmitting ? t('profile.saving') : t('profile.save_changes')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyReviewsPage;
