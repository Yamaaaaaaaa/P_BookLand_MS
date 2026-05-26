import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../styles/components/recommendations.css';
import bookService from '../api/bookService';
import type { Book } from '../types/Book';
import { useTranslation } from 'react-i18next';

const Recommendations = () => {
    const [books, setBooks] = useState<Book[]>([]);
    const { t } = useTranslation();

    useEffect(() => {
        const fetchRecommendations = async () => {
            try {
                const response = await bookService.getAllBooks({
                    pinned: true,
                    page: 0,
                    size: 5
                });
                if (response.result && response.result.content) {
                    setBooks(response.result.content);
                }
            } catch (error) {
                console.error("Failed to fetch recommendations", error);
            }
        };

        fetchRecommendations();
    }, []);

    return (
        <section className="recommendations-section">
            <div className="recommendations-container">
                <div className="recommendations-header">
                    <h2 className="recommendations-title">{t('home.recommendations.title')}</h2>
                    {/* Filter tabs could go here */}
                </div>
                <div className="recommendations-grid">
                    {books.map((book) => (
                        <Link key={book.id} to={`/shop/book-detail/${book.id}`} className="recommend-card">
                            <div className="recommend-image-wrapper">
                                <img src={book.bookImageUrl} alt={book.name} className="recommend-image" />
                            </div>
                            <div className="recommend-info">
                                <h3 className="recommend-book-name">{book.name}</h3>
                                <div className="recommend-price-row">
                                    <span className="recommend-current-price">
                                        {book.finalPrice?.toLocaleString('vi-VN')} đ
                                    </span>
                                    {book.sale > 0 && (
                                        <span className="recommend-discount">-{Math.round(book.sale)}%</span>
                                    )}
                                </div>
                                {book.sale > 0 && (
                                    <div className="recommend-original-price">
                                        {book.originalCost.toLocaleString('vi-VN')} đ
                                    </div>
                                )}
                                <div className="recommend-stats">
                                    <div className="recommend-rating">
                                        <span className="star-filled">★★★★★</span>
                                    </div>
                                    <span className="recommend-sold">| Đã bán {Math.floor(Math.random() * 100) + 1}</span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

            </div>
        </section>
    );
};

export default Recommendations;
