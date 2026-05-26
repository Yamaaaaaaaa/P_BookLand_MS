import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import '../../styles/components/pagination.css';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {


    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxVisiblePages = 5;

        if (totalPages <= maxVisiblePages) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (currentPage <= 3) {
                pages.push(1, 2, 3, 4, '...', totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
            } else {
                pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
            }
        }

        return pages;
    };

    return (
        <div className="pagination-container">
            <button
                className="pagination-btn pagination-nav"
                onClick={() => onPageChange(1)}
                disabled={currentPage === 1}
                title="First Page"
            >
                <ChevronsLeft size={18} />
            </button>
            <button
                className="pagination-btn pagination-nav"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                title="Previous Page"
            >
                <ChevronLeft size={18} />
            </button>

            {getPageNumbers().map((page, index) => (
                <button
                    key={index}
                    onClick={() => typeof page === 'number' ? onPageChange(page) : null}
                    disabled={page === '...'}
                    className={`pagination-btn ${currentPage === page ? 'active' : ''} ${page === '...' ? 'dots' : ''}`}
                >
                    {page}
                </button>
            ))}

            <button
                className="pagination-btn pagination-nav"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                title="Next Page"
            >
                <ChevronRight size={18} />
            </button>
            <button
                className="pagination-btn pagination-nav"
                onClick={() => onPageChange(totalPages)}
                disabled={currentPage === totalPages}
                title="Last Page"
            >
                <ChevronsRight size={18} />
            </button>
        </div>
    );
};

export default Pagination;
