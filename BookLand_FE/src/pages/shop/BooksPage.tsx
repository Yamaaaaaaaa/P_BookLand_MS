import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Grid, List, Filter as FilterIcon, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react';
import Breadcrumb from '../../components/common/Breadcrumb';
import BookGrid from '../../components/BooksGrid';
import bookService from '../../api/bookService';
import type { Book } from '../../types/Book';
import { normalizeBookDocument } from '../../types/Book';
import type { Page } from '../../types/api';
import '../../styles/pages/books.css';
import '../../styles/components/book-card.css';
import FilterSidebar from '../../components/FilterSidebar';
import { useTranslation } from 'react-i18next';

const BooksPage = () => {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const keyword = searchParams.get('keyword') || '';

    // States
    const [books, setBooks] = useState<Book[]>([]);
    const [pageData, setPageData] = useState<Page<Book> | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(0); // 0-indexed for API
    const [pageSize, setPageSize] = useState(12);

    const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>(() => {
        const categoryParam = searchParams.get('category');
        return categoryParam ? [Number(categoryParam)] : [];
    });

    // Update category from URL params when they change
    useEffect(() => {
        const categoryParam = searchParams.get('category');
        if (categoryParam) {
            const newId = Number(categoryParam);
            setSelectedCategoryIds(prev => {
                if (prev.length === 1 && prev[0] === newId) return prev;
                return [newId];
            });
        }
    }, [searchParams]);
    const [selectedPriceRange, setSelectedPriceRange] = useState('');
    const [selectedAuthorIds, setSelectedAuthorIds] = useState<number[]>([]);
    const [selectedPublisherIds, setSelectedPublisherIds] = useState<number[]>([]);
    const [selectedSeriesIds, setSelectedSeriesIds] = useState<number[]>([]);

    const [selectedSort, setSelectedSort] = useState('default');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const fetchBooks = useCallback(async () => {
        setIsLoading(true);
        try {
            if (keyword) {
                // ─── Có keyword: dùng Elasticsearch search API ───────────────
                const esParams: any = {
                    keyword,
                    page: currentPage,
                    size: pageSize,
                };

                // Sorting được ES hỗ trợ cho các trường số
                switch (selectedSort) {
                    case 'price-low':
                        esParams.sortBy = 'finalPrice';
                        esParams.sortDirection = 'ASC';
                        break;
                    case 'price-high':
                        esParams.sortBy = 'finalPrice';
                        esParams.sortDirection = 'DESC';
                        break;
                    default:
                        // Không truyền sortBy → ES tự sắp xếp theo relevance score
                        break;
                }

                const response = await bookService.searchBooks(esParams);
                if (response.result) {
                    // Normalize BookDocument → Book để BookGrid hiển thị được
                    const normalized = response.result.content.map(normalizeBookDocument);
                    setBooks(normalized);
                    setPageData(response.result as unknown as Page<Book>);
                }
            } else {
                // ─── Không có keyword: dùng MySQL API với filter sidebar ─────
                const params: any = {
                    page: currentPage,
                    size: pageSize,
                };

                if (selectedCategoryIds.length > 0) params.categoryIds = selectedCategoryIds;

                if (selectedPriceRange) {
                    if (selectedPriceRange === '700000-up') {
                        params.minPrice = 700000;
                    } else {
                        const [min, max] = selectedPriceRange.split('-').map(Number);
                        params.minPrice = min;
                        params.maxPrice = max;
                    }
                }

                if (selectedAuthorIds.length > 0) params.authorIds = selectedAuthorIds;
                if (selectedPublisherIds.length > 0) params.publisherIds = selectedPublisherIds;
                if (selectedSeriesIds.length > 0) params.seriesIds = selectedSeriesIds;

                switch (selectedSort) {
                    case 'price-low':
                        params.sortBy = 'originalCost';
                        params.sortDirection = 'ASC';
                        break;
                    case 'price-high':
                        params.sortBy = 'originalCost';
                        params.sortDirection = 'DESC';
                        break;
                    case 'newest':
                        params.sortBy = 'createdAt';
                        params.sortDirection = 'DESC';
                        break;
                }

                const response = await bookService.getAllBooks(params);
                if (response.result) {
                    setBooks(response.result.content);
                    setPageData(response.result);
                }
            }
        } catch (error) {
            console.error('Failed to fetch books:', error);
        } finally {
            setIsLoading(false);
        }
    }, [keyword, selectedCategoryIds, selectedPriceRange, selectedAuthorIds, selectedPublisherIds, selectedSeriesIds, selectedSort, currentPage, pageSize]);

    useEffect(() => {
        fetchBooks();
    }, [fetchBooks]);

    // Reset to page 0 when filters change
    useEffect(() => {
        setCurrentPage(0);
    }, [keyword, selectedCategoryIds, selectedPriceRange, selectedAuthorIds, selectedPublisherIds, selectedSeriesIds, selectedSort]);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 0 && newPage < (pageData?.totalPages || 0)) {
            setCurrentPage(newPage);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    // Toggle handlers for multi-select filters
    const handleCategoryToggle = useCallback((id: number) => {
        setSelectedCategoryIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
    }, []);

    const handleAuthorToggle = useCallback((id: number) => {
        setSelectedAuthorIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
    }, []);

    const handlePublisherToggle = useCallback((id: number) => {
        setSelectedPublisherIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
    }, []);

    const handleSeriesToggle = useCallback((id: number) => {
        setSelectedSeriesIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
    }, []);

    const handleClearAllFilters = useCallback(() => {
        setSelectedCategoryIds([]);
        setSelectedAuthorIds([]);
        setSelectedPublisherIds([]);
        setSelectedSeriesIds([]);
        setSelectedPriceRange('');
    }, []);

    return (
        <div className="books-page">
            <div className="shop-container">
                {/* Breadcrumbs */}
                <Breadcrumb
                    items={[
                        { label: t('shop.home_breadcrumb'), link: '/shop/home' },
                        { label: t('shop.books_breadcrumb') }
                    ]}
                />

                <div className="books-layout">
                    {/* Sidebar */}
                    <FilterSidebar
                        selectedCategoryIds={selectedCategoryIds}
                        onCategoryToggle={handleCategoryToggle}
                        onCategoryClear={() => setSelectedCategoryIds([])}
                        selectedPriceRange={selectedPriceRange}
                        onPriceRangeChange={setSelectedPriceRange}
                        selectedAuthorIds={selectedAuthorIds}
                        onAuthorToggle={handleAuthorToggle}
                        onAuthorClear={() => setSelectedAuthorIds([])}
                        selectedPublisherIds={selectedPublisherIds}
                        onPublisherToggle={handlePublisherToggle}
                        onPublisherClear={() => setSelectedPublisherIds([])}
                        selectedSeriesIds={selectedSeriesIds}
                        onSeriesToggle={handleSeriesToggle}
                        onSeriesClear={() => setSelectedSeriesIds([])}
                        onClearAll={handleClearAllFilters}
                        isMobileOpen={isSidebarOpen}
                        onClose={() => setIsSidebarOpen(false)}
                    />

                    {/* Main Content */}
                    <main className="books-content">
                        {/* Toolbar */}
                        <div className="books-toolbar">
                            <div className="toolbar-left">
                                <span className="sort-label">{t('shop.sort_label')}</span>
                                <select
                                    className="select-sort"
                                    value={selectedSort}
                                    onChange={(e) => setSelectedSort(e.target.value)}
                                >
                                    <option value="default">{t('shop.sort_default')}</option>
                                    <option value="newest">{t('shop.sort_newest')}</option>
                                    <option value="price-low">{t('shop.sort_price_low')}</option>
                                    <option value="price-high">{t('shop.sort_price_high')}</option>
                                </select>
                                <select
                                    className="select-limit"
                                    value={pageSize}
                                    onChange={(e) => setPageSize(Number(e.target.value))}
                                >
                                    <option value={12}>{t('shop.items_per_page', { count: 12 })}</option>
                                    <option value={24}>{t('shop.items_per_page', { count: 24 })}</option>
                                    <option value={48}>{t('shop.items_per_page', { count: 48 })}</option>
                                </select>
                            </div>
                            <div className="toolbar-right">
                                <div className="view-mode">
                                    <button
                                        className={`btn-view ${viewMode === 'grid' ? 'active' : ''}`}
                                        onClick={() => setViewMode('grid')}
                                    >
                                        <Grid size={18} />
                                    </button>
                                    <button
                                        className={`btn-view ${viewMode === 'list' ? 'active' : ''}`}
                                        onClick={() => setViewMode('list')}
                                    >
                                        <List size={18} />
                                    </button>
                                </div>
                                <button className="btn-filter-mobile" onClick={() => setIsSidebarOpen(true)}>
                                    <FilterIcon size={18} />
                                    {t('shop.filter_button')}
                                </button>
                            </div>
                        </div>

                        {/* Keyword Badge */}
                        {keyword && (
                            <div className="search-keyword-banner">
                                {t('shop.search_result')} <strong>"{keyword}"</strong>
                            </div>
                        )}

                        {/* Grid */}
                        <div className="books-grid-wrapper">
                            {isLoading ? (
                                <div className="loading-state">
                                    <div className="loader"></div>
                                    <p>{t('shop.loading')}</p>
                                </div>
                            ) : books.length > 0 ? (
                                <BookGrid books={books} columns={4} viewMode={viewMode} />
                            ) : (
                                <div className="empty-state">
                                    <img src="/empty-books.png" alt="No books found" style={{ maxWidth: '200px', opacity: 0.5 }} />
                                    <p>{t('shop.empty_result')}</p>
                                </div>
                            )}
                        </div>

                        {/* Pagination */}
                        {!isLoading && pageData && pageData.totalPages > 1 && (
                            <div className="pagination">
                                <button
                                    className="pagination-btn"
                                    disabled={pageData.first}
                                    onClick={() => handlePageChange(currentPage - 1)}
                                >
                                    <ChevronLeft size={18} />
                                </button>

                                {Array.from({ length: pageData.totalPages }, (_, i) => {
                                    // Show first, last, and current with surrounding
                                    if (
                                        i === 0 ||
                                        i === pageData.totalPages - 1 ||
                                        (i >= currentPage - 1 && i <= currentPage + 1)
                                    ) {
                                        return (
                                            <button
                                                key={i}
                                                className={`pagination-number ${currentPage === i ? 'active' : ''}`}
                                                onClick={() => handlePageChange(i)}
                                            >
                                                {i + 1}
                                            </button>
                                        );
                                    } else if (i === 1 || i === pageData.totalPages - 2) {
                                        return <span key={i} className="pagination-ellipsis">...</span>;
                                    }
                                    return null;
                                })}

                                <button
                                    className="pagination-btn"
                                    disabled={pageData.last}
                                    onClick={() => handlePageChange(currentPage + 1)}
                                >
                                    <ChevronRightIcon size={18} />
                                </button>
                            </div>
                        )}
                    </main>
                </div>
            </div>

            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>}
        </div>
    );
};

export default BooksPage;
