import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Heart } from 'lucide-react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import '../styles/components/weekly-bestseller.css';
import bookService from '../api/bookService';
import categoryService from '../api/categoryService';
import cartService from '../api/cartService';
import wishlistService from '../api/wishlistService';
import { getCurrentUserId } from '../utils/auth';
import type { Book } from '../types/Book';
import type { Category } from '../types/Category';

const WeeklyBestseller = () => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
    const [books, setBooks] = useState<Book[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const navigate = useNavigate();
    const { t } = useTranslation();

    // Fetch Categories
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await categoryService.getAll({ page: 0, size: 20 });
                if (response.result && response.result.content && response.result.content.length > 0) {
                    setCategories(response.result.content);
                    setActiveCategoryId(response.result.content[0].id);
                }
            } catch (error) {
                console.error("Failed to fetch categories", error);
            }
        };
        fetchCategories();
    }, []);

    // Fetch Books when active category changes
    useEffect(() => {
        if (activeCategoryId === null) return;

        const fetchBestSellers = async () => {
            try {
                const response = await bookService.getBestSellingBooks({
                    period: 'MONTH',
                    categoryIds: [activeCategoryId],
                    page: 0,
                    size: 5
                });
                if (response.result && response.result.content) {
                    setBooks(response.result.content);
                    setSelectedIndex(0); // Reset selection
                }
            } catch (error) {
                console.error("Failed to fetch bestseller books", error);
            }
        };

        fetchBestSellers();
    }, [activeCategoryId]);

    const handleAddToCart = async (book: Book) => {
        const userId = getCurrentUserId();
        if (!userId) {
            toast.warning(t('home.bestseller.login_cart'));
            navigate('/login');
            return;
        }
        try {
            await cartService.addToCart(userId, { bookId: book.id, quantity: 1 });
            toast.success(t('home.bestseller.add_cart_success'));
            window.dispatchEvent(new Event('cart:updated'));
        } catch (error) {
            console.error("Failed to add to cart", error);
            toast.error(t('home.bestseller.add_cart_fail'));
        }
    };

    const handleAddToWishlist = async (book: Book) => {
        const userId = getCurrentUserId();
        if (!userId) {
            toast.warning(t('home.bestseller.login_wishlist'));
            navigate('/login');
            return;
        }
        try {
            await wishlistService.addToWishlist(userId, { bookId: book.id });
            toast.success(t('home.bestseller.add_wishlist_success'));
        } catch (error) {
            console.error("Failed to add to wishlist", error);
            toast.error(t('home.bestseller.add_wishlist_fail'));
        }
    };

    const selectedBook = books[selectedIndex];

    return (
        <section className="weekly-bestseller">
            <div className="bestseller-container">
                <div className="bestseller-header">
                    <h2 className="bestseller-title">{t('home.bestseller.title')}</h2>
                </div>

                <div className="bestseller-content">
                    <div className="bestseller-tabs">
                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                className={`bestseller-tab-btn ${activeCategoryId === cat.id ? 'active' : ''}`}
                                onClick={() => setActiveCategoryId(cat.id)}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>

                    <div className="bestseller-main">
                        {/* Ranking List */}
                        <div className="ranking-list">
                            {books.map((book, index) => (
                                <div
                                    key={book.id}
                                    className={`ranking-item ${selectedIndex === index ? 'selected' : ''}`}
                                    onMouseEnter={() => setSelectedIndex(index)}
                                >
                                    <span className={`ranking-number rank-${index + 1}`}>
                                        {String(index + 1).padStart(2, '0')}
                                    </span>
                                    <img src={book.bookImageUrl} alt={book.name} className="ranking-thumb" />
                                    <div className="ranking-info">
                                        <h4 className="ranking-book-title">{book.name}</h4>
                                        <p className="ranking-author">{book.authorName}</p>
                                        <p className="ranking-points">{t('home.bestseller.sold', { count: Math.floor(Math.random() * 200) + 100 })}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Selected Book Detail */}
                        {selectedBook && (
                            <div className="ranking-detail">
                                <div className="detail-visual">
                                    <img src={selectedBook.bookImageUrl} alt={selectedBook.name} className="detail-image" />
                                </div>
                                <div className="detail-info">
                                    <Link to={`/shop/book-detail/${selectedBook.id}`} className="detail-title-link">
                                        <h3 className="detail-title">{selectedBook.name}</h3>
                                    </Link>
                                    <div className="detail-meta">
                                        <p>{t('book_card.author')}: <span>{selectedBook.authorName}</span></p>
                                        <p>{t('book_card.publisher')}: <span>{selectedBook.publisherName}</span></p>
                                    </div>
                                    <div className="detail-price-row">
                                        <span className="detail-current-price">{selectedBook.finalPrice?.toLocaleString('vi-VN')} đ</span>
                                        {selectedBook.sale > 0 && (
                                            <span className="detail-discount">-{Math.round(selectedBook.sale)}%</span>
                                        )}
                                    </div>
                                    {selectedBook.sale > 0 && (
                                        <div className="detail-original-price">{selectedBook.originalCost.toLocaleString('vi-VN')} đ</div>
                                    )}

                                    <div className="detail-description">
                                        <p className="desc-text">
                                            {selectedBook.description || t('shop.no_description')}
                                        </p>
                                    </div>

                                    <div className="detail-actions">
                                        <button
                                            className="action-btn add-to-cart-btn"
                                            onClick={() => handleAddToCart(selectedBook)}
                                        >
                                            <ShoppingCart size={18} />
                                            {t('home.bestseller.add_to_cart')}
                                        </button>
                                        <button
                                            className="action-btn wishlist-btn"
                                            onClick={() => handleAddToWishlist(selectedBook)}
                                        >
                                            <Heart size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default WeeklyBestseller;
