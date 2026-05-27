import BookCard from './BookCard';
import '../styles/pages/books.css';
import type { Book } from '../types/Book';

interface BookGridProps {
    books: Book[];
    columns?: number;
    viewMode?: 'grid' | 'list';
}

const BookGrid = ({ books, columns = 4, viewMode = 'grid' }: BookGridProps) => {
    if (books.length === 0) {
        return (
            <div className="book-grid__empty">
                <p>No books found matching your criteria.</p>
            </div>
        );
    }

    return (
        <div className={`book-grid book-grid--${viewMode} ${viewMode === 'grid' ? `book-grid--cols-${columns}` : ''}`}>
            {books.map((book) => (
                <div key={book.id} className="book-grid__link">
                    <BookCard book={book} viewMode={viewMode} />
                </div>
            ))}
        </div>
    );
};

export default BookGrid;
