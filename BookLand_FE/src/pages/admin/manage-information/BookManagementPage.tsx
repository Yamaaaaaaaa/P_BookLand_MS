import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';
import { formatCurrency } from '../../../utils/formatters';
import type { Book } from '../../../types/Book';
import type { Category } from '../../../types/Category';
import type { Author } from '../../../types/Author';
import type { Serie } from '../../../types/Serie';
import bookService from '../../../api/bookService';
import categoryService from '../../../api/categoryService';
import authorService from '../../../api/authorService';
import serieService from '../../../api/serieService';
import MultiSelect from '../../../components/admin/MultiSelect';
import Pagination from '../../../components/admin/Pagination';
import '../../../styles/components/buttons.css';
import '../../../styles/pages/admin-management.css';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

const BookManagementPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [books, setBooks] = useState<Book[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Filter Options State
    const [categoryOptions, setCategoryOptions] = useState<{ value: number; label: string }[]>([]);
    const [authorOptions, setAuthorOptions] = useState<{ value: number; label: string }[]>([]);
    const [seriesOptions, setSeriesOptions] = useState<{ value: number; label: string }[]>([]);

    // Filter Selection State
    const [selectedCategories, setSelectedCategories] = useState<(string | number)[]>([]);
    const [selectedAuthors, setSelectedAuthors] = useState<(string | number)[]>([]);
    const [selectedSeries, setSelectedSeries] = useState<(string | number)[]>([]);
    const [pinFilter, setPinFilter] = useState<'all' | 'pinned' | 'unpinned'>('all');

    // Sort State
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'id', direction: 'asc' });;

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(0);

    // Fetch Filter Options
    useEffect(() => {
        const fetchFilters = async () => {
            try {
                // Fetch Categories
                const catRes = await categoryService.getAll({ size: 100 });
                if (catRes.result?.content) {
                    setCategoryOptions(catRes.result.content.map((c: Category) => ({ value: c.id, label: c.name })));
                }

                // Fetch Authors
                const authRes = await authorService.getAllAuthors({ size: 100 });
                if (authRes.result?.content) {
                    setAuthorOptions(authRes.result.content.map((a: Author) => ({ value: a.id, label: a.name })));
                }

                // Fetch Series
                const serRes = await serieService.getAllSeries({ size: 100 });
                if (serRes.result?.content) {
                    setSeriesOptions(serRes.result.content.map((s: Serie) => ({ value: s.id, label: s.name })));
                }
            } catch (error) {
                console.error('Error fetching filter options:', error);
                toast.error(t('admin.book_management.options_fail'));
            }
        };

        fetchFilters();
    }, []);

    // Fetch Books
    const fetchBooks = useCallback(async () => {
        setIsLoading(true);
        try {
            const params: any = {
                page: currentPage - 1,
                size: itemsPerPage,
                keyword: searchTerm,
            };

            if (selectedCategories.length > 0) {
                params.categoryIds = selectedCategories.map(Number);
            }
            if (selectedAuthors.length > 0) {
                params.authorIds = selectedAuthors.map(Number);
            }
            if (selectedSeries.length > 0) {
                params.seriesIds = selectedSeries.map(Number);
            }
            if (pinFilter !== 'all') {
                params.pinned = pinFilter === 'pinned';
            }
            if (sortConfig) {
                params.sortBy = sortConfig.key;
                params.sortDirection = sortConfig.direction;
            }

            const response = await bookService.getAllBooks(params);
            if (response.result) {
                setBooks(response.result.content);
                setTotalPages(response.result.totalPages);
            }
        } catch (error) {
            console.error('Error fetching books:', error);
            toast.error(t('admin.book_management.fetch_fail'));
        } finally {
            setIsLoading(false);
        }
    }, [currentPage, itemsPerPage, searchTerm, selectedCategories, selectedAuthors, selectedSeries, pinFilter, sortConfig]);

    useEffect(() => {
        // Debounce search
        const timer = setTimeout(() => {
            fetchBooks();
        }, 500);
        return () => clearTimeout(timer);
    }, [fetchBooks]);

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm(t('admin.book_management.confirm_delete'))) {
            try {
                await bookService.deleteBook(id);
                toast.success(t('admin.book_management.delete_success'));
                fetchBooks(); // Refresh list
            } catch (error) {
                console.error('Error deleting book:', error);
                toast.error(t('admin.book_management.delete_fail'));
            }
        }
    };

    const getSortIcon = (key: string) => {
        if (sortConfig?.key !== key) return <ArrowUpDown size={14} className="sort-icon inactive" />;
        return sortConfig.direction === 'asc'
            ? <ArrowUp size={14} className="sort-icon active" />
            : <ArrowDown size={14} className="sort-icon active" />;
    };

    // Helper to find category name by ID from options
    const getCategoryName = (id: number) => {
        return categoryOptions.find(c => c.value === id)?.label || 'Unknown';
    };

    return (
        <div className="admin-container" style={{ paddingRight: 'var(--spacing-xl)' }}>
            <div className="admin-header">
                <div>
                    <h1 className="admin-title">{t('admin.book_management.title')}</h1>
                    <p className="admin-subtitle">{t('admin.book_management.subtitle')}</p>
                </div>
                <Link to="/admin/manage-information/book-detail/new" className="btn-primary">
                    <Plus size={20} />
                    {t('admin.book_management.add_btn')}
                </Link>
            </div>

            {/* Filters */}
            <div className="admin-toolbar" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '1rem' }}>
                <div className="search-box">
                    <Search size={18} className="search-box-icon" />
                    <input
                        type="text"
                        className="search-input"
                        placeholder={t('admin.book_management.search_placeholder')}
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1); // Reset page on search
                        }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <MultiSelect
                            label={t('admin.book_management.filter_category')}
                            options={categoryOptions}
                            value={selectedCategories}
                            onChange={(vals) => {
                                setSelectedCategories(vals);
                                setCurrentPage(1);
                            }}
                            placeholder={t('admin.book_management.filter_category')}
                        />
                    </div>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <MultiSelect
                            label={t('admin.book_management.filter_author')}
                            options={authorOptions}
                            value={selectedAuthors}
                            onChange={(vals) => {
                                setSelectedAuthors(vals);
                                setCurrentPage(1);
                            }}
                            placeholder={t('admin.book_management.filter_author')}
                        />
                    </div>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <MultiSelect
                            label={t('admin.book_management.filter_series')}
                            options={seriesOptions}
                            value={selectedSeries}
                            onChange={(vals) => {
                                setSelectedSeries(vals);
                                setCurrentPage(1);
                            }}
                            placeholder={t('admin.book_management.filter_series')}
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0, width: '150px', flexShrink: 0 }}>
                        <label className="form-label">{t('admin.book_management.filter_status')}</label>
                        <select
                            className="form-select"
                            value={pinFilter}
                            onChange={(e) => {
                                setPinFilter(e.target.value as 'all' | 'pinned' | 'unpinned');
                                setCurrentPage(1);
                            }}
                            style={{ height: '42px' }}
                        >
                            <option value="all">{t('admin.book_management.filter_status_all')}</option>
                            <option value="pinned">{t('admin.book_management.filter_status_pinned')}</option>
                            <option value="unpinned">{t('admin.book_management.filter_status_unpinned')}</option>
                        </select>
                    </div>

                    <button
                        onClick={() => {
                            setSearchTerm('');
                            setSelectedCategories([]);
                            setSelectedAuthors([]);
                            setSelectedSeries([]);
                            setPinFilter('all');
                            setSortConfig({ key: 'id', direction: 'asc' });
                            setCurrentPage(1);
                        }}
                        className="btn-secondary"
                        style={{ height: '42px', whiteSpace: 'nowrap', flexShrink: 0 }}
                    >
                        {t('admin.book_management.clear_filters')}
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="admin-table-container">
                {isLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                        <Loader2 className="animate-spin" size={32} />
                    </div>
                ) : (
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('id')} className="sortable-header" style={{ width: '60px' }}>
                                    <div className="th-content">
                                        {t('admin.book_management.table.id')} {getSortIcon('id')}
                                    </div>
                                </th>
                                <th onClick={() => handleSort('name')} className="sortable-header">
                                    <div className="th-content">
                                        {t('admin.book_management.table.book')} {getSortIcon('name')}
                                    </div>
                                </th>
                                <th>{t('admin.book_management.table.category')}</th>
                                <th>{t('admin.book_management.table.author')}</th>
                                <th>{t('admin.book_management.table.series')}</th>
                                <th>{t('admin.book_management.table.pin')}</th>
                                <th onClick={() => handleSort('originalCost')} className="sortable-header">
                                    <div className="th-content">
                                        {t('admin.book_management.table.price')} {getSortIcon('originalCost')}
                                    </div>
                                </th>
                                <th>{t('admin.book_management.table.stock')}</th>
                                <th>{t('admin.book_management.table.status')}</th>
                                <th style={{ textAlign: 'right' }}>{t('admin.book_management.table.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {books.map(book => (
                                <tr key={book.id}>
                                    <td>#{book.id}</td>
                                    <td>
                                        <div className="info-cell">
                                            <img
                                                src={book.bookImageUrl || 'https://via.placeholder.com/50'}
                                                alt={book.name}
                                                className="info-book-image"
                                            />
                                            <div className="info-content">
                                                <div className="info-title">{book.name}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ maxWidth: '150px', lineHeight: '1.4' }}>
                                            {book.categoryIds?.map(id => getCategoryName(id)).filter(Boolean).join(', ') || '-'}
                                        </div>
                                    </td>
                                    <td>{book.authorName}</td>
                                    <td>{book.seriesName || '-'}</td>
                                    <td>
                                        {book.pin ? (
                                            <span style={{
                                                fontSize: '0.7rem',
                                                backgroundColor: 'var(--shop-accent-primary)',
                                                color: '#fff',
                                                padding: '0.2rem 0.5rem',
                                                borderRadius: '4px',
                                                fontWeight: 600,
                                                display: 'inline-block'
                                            }}>
                                                {t('admin.book_management.pinned')}
                                            </span>
                                        ) : (
                                            <span style={{ color: 'var(--shop-text-muted)', fontSize: '0.85rem' }}>-</span>
                                        )}
                                    </td>
                                    <td>
                                        <div>{formatCurrency(book.finalPrice || book.originalCost)}</div>
                                        {book.sale > 0 && (
                                            <div className="info-subtitle" style={{ textDecoration: 'line-through' }}>
                                                {formatCurrency(book.originalCost)}
                                            </div>
                                        )}
                                    </td>
                                    <td>{book.stock}</td>
                                    <td>
                                        <span className={`status-badge ${book.status === 'ENABLE' ? 'enable' : 'disable'}`}>
                                            {book.status}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <div className="action-buttons">
                                            <button
                                                className="btn-icon"
                                                onClick={() => navigate(`/admin/manage-information/book-detail/${book.id}`)}
                                                title={t('admin.book_management.edit_tooltip')}
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <button
                                                className="btn-icon delete"
                                                onClick={() => handleDelete(book.id)}
                                                title={t('admin.book_management.delete_tooltip')}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                {!isLoading && books.length === 0 && (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--shop-text-muted)' }}>
                        {t('admin.book_management.no_books')}
                    </div>
                )}
            </div>

            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
            />
        </div>
    );
};

export default BookManagementPage;
