import BookCard from './BookCard';
import '../styles/pages/home.css';
import type { Book } from '../types/Book';

interface FeaturedBooksProps {
    title: string;
    subtitle?: string;
    books: Book[];
}

const FeaturedBooks = ({ title, subtitle, books }: FeaturedBooksProps) => {
    return (
        <section className="featured-books">
            <div className="shop-container">
                <div className="section-header">
                    {subtitle && <span className="section-header__subtitle">{subtitle}</span>}
                    <h2 className="section-header__title">{title}</h2>
                </div>

                <div className="featured-books__grid">
                    {books.map((book) => (
                        <BookCard key={book.id} book={book} />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default FeaturedBooks;
