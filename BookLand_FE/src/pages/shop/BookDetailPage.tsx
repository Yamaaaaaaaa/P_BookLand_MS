import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Star, ArrowLeft, Truck, RotateCcw, ShieldCheck, ChevronRight, Heart } from 'lucide-react';
import '../../styles/pages/book-detail.css';
import Breadcrumb from '../../components/common/Breadcrumb';
import BookCard from '../../components/BookCard';
import bookService from '../../api/bookService';
import cartService from '../../api/cartService';
import wishlistService from '../../api/wishlistService';
import { getCurrentUserId } from '../../utils/auth';
import type { Book } from '../../types/Book';
import type { BookComment, BookCommentSummaryResponse } from '../../types/BookComment';
import bookCommentApi from '../../api/bookCommentApi';
import { toast } from 'react-toastify';
import { formatCurrency } from '../../utils/formatters';
import { useTranslation } from 'react-i18next';

const BookDetailPage = () => {
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [book, setBook] = useState<Book | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [quantity] = useState(1);
    const [isAddingToCart, setIsAddingToCart] = useState(false);
    const [isAddingToWishlist, setIsAddingToWishlist] = useState(false);
    const [relatedBooks, setRelatedBooks] = useState<Book[]>([]);

    // Comment State
    const [comments, setComments] = useState<BookComment[]>([]);
    const [commentSummary, setCommentSummary] = useState<BookCommentSummaryResponse | null>(null);
    const [commentPage, setCommentPage] = useState(1);
    const [commentTotalPages, setCommentTotalPages] = useState(1);
    const [isCommentsLoading, setIsCommentsLoading] = useState(false);

    // Rating Stats State
    const [ratingDistribution, setRatingDistribution] = useState<Record<number, number>>({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });

    useEffect(() => {
        const fetchBookDetail = async () => {
            if (!id) return;
            setIsLoading(true);
            try {
                const response = await bookService.getBookById(Number(id));
                if (response.result) {
                    setBook(response.result);
                    // Fetch related books based on category
                    const relatedRes = await bookService.getAllBooks({
                        categoryIds: response.result.categoryIds,
                        size: 5
                    });
                    if (relatedRes.result) {
                        setRelatedBooks(relatedRes.result.content.filter(b => b.id !== Number(id)));
                    }
                }
            } catch (error) {
                console.error('Failed to fetch book details:', error);
                toast.error(t('product.load_error'));
            } finally {
                setIsLoading(false);
            }
        };

        const fetchAllCommentsForStats = async () => {
            if (!id) return;
            try {
                // Fetch up to 1000 comments for stats
                const response = await bookCommentApi.getCommentsByBook(Number(id), {
                    page: 1,
                    size: 1000, // Fetch large number to get all for stats
                    sortBy: 'createdAt',
                    sortDirection: 'DESC'
                });
                if (response.result) {
                    const allComments = response.result.comments.content;
                    const stats: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
                    allComments.forEach(comment => {
                        if (comment.rating >= 1 && comment.rating <= 5) {
                            stats[comment.rating] = (stats[comment.rating] || 0) + 1;
                        }
                    });
                    setRatingDistribution(stats);
                }
            } catch (error) {
                console.error("Failed to fetch comments for stats:", error);
            }
        };

        fetchBookDetail();
        fetchAllCommentsForStats();
    }, [id, t]);

    useEffect(() => {
        if (!id) return;
        const fetchComments = async () => {
            setIsCommentsLoading(true);
            try {
                const response = await bookCommentApi.getCommentsByBook(Number(id), {
                    page: commentPage,
                    size: 5,
                    sortBy: 'createdAt',
                    sortDirection: 'DESC'
                });
                if (response.result) {
                    setCommentSummary(response.result);
                    setComments(response.result.comments.content);
                    console.log("comments: ", response.result.comments.content);
                    console.log("commentSummary: ", response.result);
                    setCommentTotalPages(response.result.comments.totalPages);
                }
            } catch (error) {
                console.error('Failed to fetch comments:', error);
            } finally {
                setIsCommentsLoading(false);
            }
        };
        fetchComments();
    }, [id, commentPage]);



    const handleAddToCart = async () => {
        const userId = getCurrentUserId();
        if (!userId) {
            toast.warning(t('product.login_required_cart'));
            navigate('/shop/login');
            return;
        }

        if (!book) return;

        setIsAddingToCart(true);
        try {
            await cartService.addToCart(userId, {
                bookId: book.id,
                quantity: quantity
            });
            toast.success(t('product.add_cart_success', { quantity, name: book.name }));
            window.dispatchEvent(new Event('cart:updated'));
        } catch (error) {
            console.error('Failed to add to cart:', error);
            toast.error(t('product.add_cart_error'));
        } finally {
            setIsAddingToCart(false);
        }
    };

    const handleAddToWishlist = async () => {
        const userId = getCurrentUserId();
        if (!userId) {
            toast.warning(t('product.login_required_wishlist'));
            navigate('/shop/login');
            return;
        }

        if (!book) return;

        setIsAddingToWishlist(true);
        try {
            await wishlistService.addToWishlist(userId, {
                bookId: book.id
            });
            toast.success(t('product.add_wishlist_success', { name: book.name }));
        } catch (error) {
            console.error('Failed to add to wishlist:', error);
            toast.error(t('product.add_wishlist_error'));
        } finally {
            setIsAddingToWishlist(false);
        }
    };

    if (isLoading) {
        return (
            <div className="book-not-found-page">
                <div className="shop-container">
                    <div className="loading-state">
                        <div className="loader"></div>
                        <p>{t('shop.loading')}</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!book) {
        return (
            <div className="book-not-found-page">
                <div className="shop-container">
                    <div className="not-found-content">
                        <h2>{t('product.not_found')}</h2>
                        <Link to="/shop/books" className="btn-back-home">
                            <ArrowLeft size={16} /> {t('product.back_home')}
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Determine total ratings from our local stats or fallback to summary
    // Just sum up values in ratingDistribution
    const totalRatingsCalculated = Object.values(ratingDistribution).reduce((a, b) => a + b, 0);
    // Use the calculated total if available and > 0, otherwise fallback
    const displayTotalReviews = totalRatingsCalculated > 0 ? totalRatingsCalculated : (commentSummary?.totalComments || 0);

    return (
        <div className="book-detail-page">
            <div className="shop-container">
                {/* Breadcrumb */}
                <Breadcrumb
                    items={[
                        { label: t('shop.home_breadcrumb'), link: '/shop/home' },
                        { label: t('shop.books_breadcrumb'), link: '/shop/books' },
                        { label: book.name }
                    ]}
                />

                <div className="detail-main-content">
                    {/* Left: Product Media & Policy */}
                    <div className="detail-left-col">
                        <div className="detail-left-sticky">
                            <div className="detail-image-card">
                                <div className="detail-main-image">
                                    <img src={book.bookImageUrl || 'https://via.placeholder.com/400x600'} alt={book.name} />
                                    {book.sale > 0 && (
                                        <div className="detail-sale-badge">-{book.sale}%</div>
                                    )}
                                </div>
                                <div className="detail-thumbnails">
                                    <img src={book.bookImageUrl || 'https://via.placeholder.com/400x600'} className="thumb active" alt="thumb" />
                                </div>
                                <div className="detail-actions">
                                    <button
                                        className={`btn-add-cart ${isAddingToCart ? 'loading' : ''}`}
                                        onClick={handleAddToCart}
                                        disabled={isAddingToCart}
                                    >
                                        <ShoppingCart size={20} />
                                        <span style={{ marginLeft: '10px' }}>{isAddingToCart ? t('product.adding_to_cart') : t('product.add_to_cart')}</span>
                                    </button>
                                    <button
                                        className={`btn-add-wishlist ${isAddingToWishlist ? 'loading' : ''}`}
                                        onClick={handleAddToWishlist}
                                        disabled={isAddingToWishlist}
                                        title={t('product.add_to_wishlist', 'Thêm vào yêu thích')}
                                    >
                                        <Heart size={22} />
                                    </button>
                                </div>
                            </div>

                            <div className="detail-policy-card">
                                <h3>{t('product.policy_title')}</h3>
                                <div className="policy-item">
                                    <Truck size={20} color="#C92127" />
                                    <div className="policy-text">
                                        <div className="p-title">{t('product.policy_delivery')} <span>{t('product.policy_delivery_desc')}</span></div>
                                    </div>
                                    <ChevronRight size={16} color="#999" />
                                </div>
                                <div className="policy-item">
                                    <RotateCcw size={20} color="#C92127" />
                                    <div className="policy-text">
                                        <div className="p-title">{t('product.policy_return')} <span>{t('product.policy_return_desc')}</span></div>
                                    </div>
                                    <ChevronRight size={16} color="#999" />
                                </div>
                                <div className="policy-item">
                                    <ShieldCheck size={20} color="#C92127" />
                                    <div className="policy-text">
                                        <div className="p-title">{t('product.policy_wholesale')} <span>{t('product.policy_wholesale_desc')}</span></div>
                                    </div>
                                    <ChevronRight size={16} color="#999" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Product Info */}
                    <div className="detail-right-col">
                        <div className="detail-info-card">
                            <h1 className="detail-book-title">{book.name}</h1>
                            <div className="detail-quick-meta">
                                <div className="meta-row">
                                    <span>{t('product.spec_supplier')}: <strong>{book.publisherName}</strong></span>
                                    <span>{t('product.spec_author')}: <strong>{book.authorName}</strong></span>
                                </div>
                                <div className="meta-row">
                                    <span>{t('product.spec_publisher')}: <strong>{book.publisherName}</strong></span>
                                    <span>{t('product.spec_cover')}: <strong>{t('product.spec_cover_value')}</strong></span>
                                </div>
                            </div>

                            <div className="detail-rating-row">
                                <div className="stars-box">
                                    {[1, 2, 3, 4, 5].map(s => (
                                        <Star
                                            key={s}
                                            size={14}
                                            fill={s <= (commentSummary?.averageRating || book.rating || 5) ? "#F69113" : "none"}
                                            color="#F69113"
                                        />
                                    ))}
                                    <span className="rating-count">{t('product.reviews_count', { count: comments.length || book.ratingCount || 0 })}</span>
                                </div>
                                <div className="sold-count">| {t('product.sold_count', { count: book.ratingCount ? book.ratingCount * 12 : 24 })}</div>
                            </div>

                            <div className="detail-price-box">
                                <div className="price-primary">
                                    <span className="current">{formatCurrency(book.finalPrice)}</span>
                                    {book.sale > 0 && (
                                        <>
                                            <span className="original">{formatCurrency(book.originalCost)}</span>
                                            <span className="discount">-{book.sale}%</span>
                                        </>
                                    )}
                                </div>
                                <div className="price-note">{t('product.price_note')}</div>
                            </div>

                            <div className="quantity-section">
                                {/* <label>{t('product.quantity')}</label>
                                <div className="quantity-control">
                                    <button onClick={() => handleQuantityChange('dec')}><Minus size={14} /></button>
                                    <input type="text" value={quantity} readOnly />
                                    <button onClick={() => handleQuantityChange('inc')}><Plus size={14} /></button>
                                </div> */}
                            </div>
                        </div>

                        {/* Detailed Table */}
                        <div className="detail-specs-card">
                            <h3>{t('product.specs_title')}</h3>
                            <div className="specs-table">
                                <div className="spec-row">
                                    <div className="spec-label">{t('product.spec_sku')}</div>
                                    <div className="spec-value">{8935278600000 + book.id}</div>
                                </div>
                                <div className="spec-row">
                                    <div className="spec-label">{t('product.spec_supplier')}</div>
                                    <div className="spec-value">{book.publisherName}</div>
                                </div>
                                <div className="spec-row">
                                    <div className="spec-label">{t('product.spec_author')}</div>
                                    <div className="spec-value">{book.authorName}</div>
                                </div>
                                <div className="spec-row">
                                    <div className="spec-label">{t('product.spec_publisher')}</div>
                                    <div className="spec-value">{book.publisherName}</div>
                                </div>
                                <div className="spec-row">
                                    <div className="spec-label">{t('product.spec_series')}</div>
                                    <div className="spec-value">{book.seriesName || 'N/A'}</div>
                                </div>
                                <div className="spec-row">
                                    <div className="spec-label">{t('product.spec_volume')}</div>
                                    <div className="spec-value">{book.volume || '1'}</div>
                                </div>
                                <div className="spec-row">
                                    <div className="spec-label">{t('product.spec_cover')}</div>
                                    <div className="spec-value">{t('product.spec_cover_value')}</div>
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="detail-desc-card">
                            <h3>{t('product.desc_title')}</h3>
                            <div className="desc-content">
                                <strong>{book.name}</strong>
                                <p>{book.description || t('product.desc_loading')}</p>
                            </div>
                            <div className="desc-footer">
                                <button className="btn-show-more">{t('product.view_more')}</button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Full-Width Sections */}
                <div className="detail-bottom-content">
                    {/* Related Products Section */}
                    {relatedBooks.length > 0 && (
                        <div className="detail-related-card">
                            <h3>{t('product.related_products_title')}</h3>
                            <div className="related-grid">
                                {relatedBooks.map(item => (
                                    <BookCard key={item.id} book={item} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Reviews */}
                    <div className="detail-reviews-card">
                        <h3>{t('product.reviews_title')}</h3>

                        {commentSummary && (
                            <div className="reviews-summary">
                                <div className="rev-score">
                                    {commentSummary.averageRating.toFixed(1)}<span>/5</span>
                                </div>
                                <div className="rev-stars">
                                    {[1, 2, 3, 4, 5].map(s => (
                                        <Star
                                            key={s}
                                            size={18}
                                            fill={s <= Math.round(commentSummary.averageRating) ? "#F69113" : "none"}
                                            color={s <= Math.round(commentSummary.averageRating) ? "#F69113" : "#ddd"}
                                        />
                                    ))}
                                    <div className="rev-count">({displayTotalReviews} đánh giá)</div>
                                </div>
                                <div className="rev-chart">
                                    {[5, 4, 3, 2, 1].map(r => {
                                        // Use our calculated distribution
                                        const count = ratingDistribution[r] || 0;
                                        // Use calculated total
                                        const total = displayTotalReviews;
                                        const percent = total > 0
                                            ? (count / total) * 100
                                            : 0;
                                        return (
                                            <div key={r} className="chart-item">
                                                <span>{r} sao</span>
                                                <div className="bar-bg">
                                                    <div className="bar-fill" style={{ width: `${percent}%` }}></div>
                                                </div>
                                                <span className="chart-item__stat">
                                                    <span className="chart-item__count">{count}</span>
                                                    <span className="chart-item__percent">({percent.toFixed(0)}%)</span>
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="reviews-list">
                            {isCommentsLoading ? (
                                <p>{t('product.review_loading')}</p>
                            ) : comments.length > 0 ? (
                                comments.map(comment => (
                                    <div key={comment.id} className="review-item" style={{
                                        display: 'flex',
                                        padding: '20px 0',
                                        borderBottom: '1px solid #eee'
                                    }}>
                                        {/* Left Column: User Info */}
                                        <div className="review-user-col" style={{
                                            width: '200px',
                                            flexShrink: 0,
                                            paddingRight: '20px'
                                        }}>
                                            <div className="reviewer-name" style={{
                                                fontWeight: '600',
                                                color: '#333',
                                                marginBottom: '4px'
                                            }}>
                                                {comment.userName}
                                            </div>
                                            <div className="review-date" style={{
                                                fontSize: '12px',
                                                color: '#999'
                                            }}>
                                                {new Date(comment.createdAt).toLocaleDateString(t('language') === 'en' ? 'en-US' : 'vi-VN')}
                                            </div>
                                        </div>

                                        {/* Right Column: Rating & Content */}
                                        <div className="review-content-col" style={{ flex: 1 }}>
                                            <div className="review-rating" style={{ marginBottom: '8px' }}>
                                                {[...Array(5)].map((_, i) => (
                                                    <Star
                                                        key={i}
                                                        size={14}
                                                        fill={i < comment.rating ? "#F69113" : "none"}
                                                        color={i < comment.rating ? "#F69113" : "#ddd"}
                                                    />
                                                ))}
                                            </div>
                                            <div className="review-text" style={{
                                                color: '#333',
                                                lineHeight: '1.5',
                                                fontSize: '14px'
                                            }}>
                                                {comment.comment}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="no-reviews" style={{ color: '#999', fontStyle: 'italic' }}>{t('product.no_reviews')}</p>
                            )}
                        </div>

                        {/* Pagination */}
                        {commentTotalPages > 1 && (
                            <div className="pagination">
                                {Array.from({ length: commentTotalPages }, (_, i) => i + 1).map(page => (
                                    <button
                                        key={page}
                                        className={`page-btn ${commentPage === page ? 'active' : ''}`}
                                        onClick={() => setCommentPage(page)}
                                    >
                                        {page}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BookDetailPage;
