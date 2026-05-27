import { Heart, ShoppingCart, Star } from 'lucide-react';
import '../styles/components/book-card.css';
import '../styles/components/buttons.css';
import type { Book } from '../types/Book';
import { useNavigate, Link } from 'react-router-dom';
import { formatCurrency } from '../utils/formatters';
import { getCurrentUserId } from '../utils/auth';
import cartService from '../api/cartService';
import wishlistService from '../api/wishlistService';
import { toast } from 'react-toastify';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface BookCardProps {
    book: Book;
    viewMode?: 'grid' | 'list';
}

const BookCard = ({ book, viewMode = 'grid' }: BookCardProps) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [isAddingToCart, setIsAddingToCart] = useState(false);
    const [isAddingToWishlist, setIsAddingToWishlist] = useState(false);

    const handleAddToCart = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const userId = getCurrentUserId();
        if (!userId) {
            toast.warning(t('product.login_required_cart'));
            navigate('/shop/login');
            return;
        }

        setIsAddingToCart(true);
        try {
            await cartService.addToCart(userId, {
                bookId: book.id,
                quantity: 1
            });
            toast.success(t('book_card.add_to_cart_success', { name: book.name }));
            window.dispatchEvent(new Event('cart:updated'));
        } catch (error) {
            console.error('Failed to add to cart:', error);
            toast.error(t('book_card.add_to_cart_error'));
        } finally {
            setIsAddingToCart(false);
        }
    };

    const handleAddToWishlist = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const userId = getCurrentUserId();
        if (!userId) {
            toast.warning(t('product.login_required_wishlist'));
            navigate('/shop/login');
            return;
        }

        setIsAddingToWishlist(true);
        try {
            await wishlistService.addToWishlist(userId, {
                bookId: book.id
            });
            toast.success(t('book_card.add_wishlist_success', { name: book.name }));
        } catch (error) {
            console.error('Failed to add to wishlist:', error);
            toast.error(t('book_card.add_wishlist_error'));
        } finally {
            setIsAddingToWishlist(false);
        }
    };

    const renderStars = (rating: number) => {
        const stars = [];
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 !== 0;

        for (let i = 0; i < fullStars; i++) {
            stars.push(<Star key={i} size={12} fill="currentColor" />);
        }
        if (hasHalfStar) {
            stars.push(<Star key="half" size={12} fill="currentColor" opacity={0.5} />);
        }
        for (let i = stars.length; i < 5; i++) {
            stars.push(<Star key={i} size={12} />);
        }

        return stars;
    };

    return (
        <Link to={`/shop/book-detail/${book.id}`} className={`book-card book-card--${viewMode}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="book-card__image-wrapper">
                <img
                    src={book.bookImageUrl || 'https://via.placeholder.com/150'}
                    alt={book.name}
                    className="book-card__image"
                />

                {/* Series/Tag (Specific slot in image area) */}
                {book.seriesName && (
                    <div className="book-card__series-tag">
                        {book.seriesName}
                    </div>
                )}

                {/* Volume Badge at Bottom Right of Image */}
                {book.volume && (
                    <div className="book-card__volume-badge">
                        {t('book_card.series_tag', { volume: book.volume })}
                    </div>
                )}

                <div className="book-card__actions">
                    <button
                        className={`book-card__action-btn ${isAddingToWishlist ? 'loading' : ''}`}
                        aria-label="Add to wishlist"
                        onClick={handleAddToWishlist}
                        disabled={isAddingToWishlist}
                    >
                        <Heart size={16} fill={isAddingToWishlist ? "currentColor" : "none"} />
                    </button>
                    <button
                        className={`book-card__action-btn ${isAddingToCart ? 'loading' : ''}`}
                        aria-label="Add to cart"
                        onClick={handleAddToCart}
                        disabled={isAddingToCart}
                    >
                        <ShoppingCart size={16} />
                    </button>
                </div>
            </div>

            <div className="book-card__content">
                <h3 className="book-card__title">{book.name}</h3>

                {viewMode === 'list' && (
                    <div className="book-card__details-list">
                        <p className="book-card__author">{t('book_card.author_label')} <strong>{book.authorName}</strong></p>
                        <p className="book-card__description">{book.description || t('book_card.updating_desc')}</p>
                    </div>
                )}

                <div className="book-card__price-row">
                    <span className="book-card__price-final">{formatCurrency(book.finalPrice)}</span>
                    {book.sale > 0 && (
                        <span className="book-card__discount">-{book.sale}%</span>
                    )}
                </div>

                {book.sale > 0 && (
                    <div className="book-card__price-original">
                        {formatCurrency(book.originalCost)}
                    </div>
                )}

                <div className="book-card__rating">
                    <div className="book-card__stars">
                        {renderStars(book.rating || 5)}
                    </div>
                    {book.ratingCount !== undefined && (
                        <span className="book-card__rating-count">({book.ratingCount})</span>
                    )}
                </div>

                {viewMode === 'list' && (
                    <div className="book-card__actions-list">
                        <button
                            className={`btn-add-cart-list ${isAddingToCart ? 'loading' : ''}`}
                            onClick={handleAddToCart}
                            disabled={isAddingToCart}
                        >
                            <ShoppingCart size={18} />
                            {isAddingToCart ? t('book_card.adding') : t('book_card.add_to_cart_btn')}
                        </button>
                    </div>
                )}
            </div>
        </Link>
    );
};

export default BookCard;
