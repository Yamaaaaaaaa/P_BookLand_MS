import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import '../styles/pages/books.css';
import categoryService from '../api/categoryService';
import authorService from '../api/authorService';
import publisherService from '../api/publisherService';
import serieService from '../api/serieService';
import { useTranslation } from 'react-i18next';

interface FilterSidebarProps {
    selectedCategoryIds: number[];
    onCategoryToggle: (id: number) => void;
    onCategoryClear: () => void;
    selectedPriceRange: string;
    onPriceRangeChange: (range: string) => void;
    selectedAuthorIds: number[];
    onAuthorToggle: (id: number) => void;
    onAuthorClear: () => void;
    selectedPublisherIds: number[];
    onPublisherToggle: (id: number) => void;
    onPublisherClear: () => void;
    selectedSeriesIds: number[];
    onSeriesToggle: (id: number) => void;
    onSeriesClear: () => void;
    onClearAll: () => void;
    isMobileOpen?: boolean;
    onClose?: () => void;
}

const FilterSidebar = ({
    selectedCategoryIds = [],
    onCategoryToggle = () => { },
    onCategoryClear = () => { },
    selectedPriceRange = '',
    onPriceRangeChange = () => { },
    selectedAuthorIds = [],
    onAuthorToggle = () => { },
    onAuthorClear = () => { },
    selectedPublisherIds = [],
    onPublisherToggle = () => { },
    onPublisherClear = () => { },
    selectedSeriesIds = [],
    onSeriesToggle = () => { },
    onSeriesClear = () => { },
    onClearAll = () => { },
    isMobileOpen = false,
    onClose = () => { }
}: FilterSidebarProps) => {
    const { t } = useTranslation();

    const priceRanges = [
        { label: t('filter.price_0_150'), value: '0-150000' },
        { label: t('filter.price_150_300'), value: '150000-300000' },
        { label: t('filter.price_300_500'), value: '300000-500000' },
        { label: t('filter.price_500_700'), value: '500000-700000' },
        { label: t('filter.price_700_up'), value: '700000-up' },
    ];

    return (
        <aside className={`filter-sidebar ${isMobileOpen ? 'filter-sidebar--mobile-open' : ''}`}>
            <div className="filter-sidebar__header">
                <h2 className="filter-sidebar__title">{t('filter.title')}</h2>
                <button className="filter-sidebar__close" onClick={onClose}>×</button>
            </div>

            <div className="filter-global-actions">
                <button className="btn-clear-all-global" onClick={onClearAll}>
                    <X size={14} /> {t('filter.clear_all')}
                </button>
            </div>

            <div className="filter-divider"></div>

            {/* Price Filter - Moved to TOP */}
            <div className="filter-section">
                <h3 className="filter-section__title">{t('filter.price_title')}</h3>
                <div className="filter-checkbox-list">
                    {priceRanges.map((range) => (
                        <label key={range.value} className="filter-checkbox-item">
                            <input
                                type="checkbox"
                                checked={selectedPriceRange === range.value}
                                onChange={() => onPriceRangeChange(range.value)}
                            />
                            <span className="checkbox-custom"></span>
                            <span className="checkbox-label">{range.label}</span>
                        </label>
                    ))}
                </div>
            </div>

            <div className="filter-divider"></div>

            {/* Category Filter */}
            <SearchableFilterSection
                title={t('filter.category_title')}
                placeholder={t('filter.category_placeholder')}
                hints={t('filter.category_hints').split(' · ')}
                hintsLabel={t('filter.hints_label')}
                onSearch={async (query) => {
                    const res = await categoryService.getAll({ keyword: query, size: 10 });
                    return res.result?.content || [];
                }}
                getById={async (id) => {
                    const res = await categoryService.getById(id);
                    return res.result;
                }}
                selectedIds={selectedCategoryIds}
                onToggle={onCategoryToggle}
                onClear={onCategoryClear}
                clearLabel={t('filter.clear_section')}
            />

            <div className="filter-divider"></div>

            {/* Author Filter */}
            <SearchableFilterSection
                title={t('filter.author_title')}
                placeholder={t('filter.author_placeholder')}
                hints={t('filter.author_hints').split(' · ')}
                hintsLabel={t('filter.hints_label')}
                onSearch={async (query) => {
                    const res = await authorService.getAllAuthors({ keyword: query, size: 10 });
                    return res.result?.content || [];
                }}
                getById={async (id) => {
                    const res = await authorService.getAuthorById(id);
                    return res.result;
                }}
                selectedIds={selectedAuthorIds}
                onToggle={onAuthorToggle}
                onClear={onAuthorClear}
                clearLabel={t('filter.clear_section')}
            />

            <div className="filter-divider"></div>

            {/* Publisher Filter */}
            <SearchableFilterSection
                title={t('filter.publisher_title')}
                placeholder={t('filter.publisher_placeholder')}
                hints={t('filter.publisher_hints').split(' · ')}
                hintsLabel={t('filter.hints_label')}
                onSearch={async (query) => {
                    const res = await publisherService.getAllPublishers({ keyword: query, size: 10 });
                    return res.result?.content || [];
                }}
                getById={async (id) => {
                    const res = await publisherService.getPublisherById(id);
                    return res.result;
                }}
                selectedIds={selectedPublisherIds}
                onToggle={onPublisherToggle}
                onClear={onPublisherClear}
                clearLabel={t('filter.clear_section')}
            />

            <div className="filter-divider"></div>

            {/* Series Filter */}
            <SearchableFilterSection
                title={t('filter.series_title')}
                placeholder={t('filter.series_placeholder')}
                hints={t('filter.series_hints').split(' · ')}
                hintsLabel={t('filter.hints_label')}
                onSearch={async (query) => {
                    const res = await serieService.getAllSeries({ keyword: query, size: 10 });
                    return res.result?.content || [];
                }}
                getById={async (id) => {
                    const res = await serieService.getSerieById(id);
                    return res.result;
                }}
                selectedIds={selectedSeriesIds}
                onToggle={onSeriesToggle}
                onClear={onSeriesClear}
                clearLabel={t('filter.clear_section')}
            />
        </aside>
    );
};

// Reusable Searchable Filter Component
const SearchableFilterSection = <T extends { id: number; name: string }>({
    title,
    placeholder,
    hints,
    hintsLabel,
    onSearch,
    getById,
    selectedIds,
    onToggle,
    onClear,
    clearLabel = 'Xóa hết'
}: {
    title: string;
    placeholder: string;
    hints?: string[];
    hintsLabel?: string;
    onSearch: (query: string) => Promise<T[]>;
    getById: (id: number) => Promise<T | null | undefined>;
    selectedIds: number[];
    onToggle: (id: number) => void;
    onClear?: () => void;
    clearLabel?: string;
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<T[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedNames, setSelectedNames] = useState<Record<number, string>>({});
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Fetch missing names for selected IDs
    useEffect(() => {
        const fetchMissingNames = async () => {
            const missingIds = selectedIds.filter(id => !selectedNames[id]);
            if (missingIds.length === 0) return;

            const newNames: Record<number, string> = {};
            await Promise.all(missingIds.map(async (id) => {
                try {
                    const item = await getById(id);
                    if (item) {
                        newNames[id] = item.name;
                    }
                } catch (error) {
                    console.error(`Failed to fetch details for ID ${id}`, error);
                }
            }));

            if (Object.keys(newNames).length > 0) {
                setSelectedNames(prev => ({ ...prev, ...newNames }));
            }
        };

        fetchMissingNames();
    }, [selectedIds, getById]); // Rely on selectedIds changing

    // Debounced Search
    useEffect(() => {
        if (!searchTerm.trim()) {
            setResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsLoading(true);
            try {
                const items = await onSearch(searchTerm);
                setResults(items);
            } catch (error) {
                console.error(`Search error for ${title}:`, error);
            } finally {
                setIsLoading(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchTerm, onSearch, title]);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="filter-section" ref={dropdownRef}>
            <h3 className="filter-section__title">{title}</h3>
            <div className="filter-search-box">
                <div className="filter-search-input-wrapper">
                    <Search size={14} className="filter-search-icon" />
                    <input
                        type="text"
                        className="filter-search-input"
                        placeholder={placeholder}
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setIsOpen(true);
                        }}
                        onFocus={() => setIsOpen(true)}
                    />
                    {isLoading && <div className="filter-search-loader"></div>}
                </div>

                {isOpen && results.length > 0 && (
                    <div className="filter-search-dropdown">
                        {results.map((item) => (
                            <div
                                key={item.id}
                                className={`filter-search-item ${selectedIds.includes(item.id) ? 'selected' : ''}`}
                                onClick={() => {
                                    if (!selectedIds.includes(item.id)) {
                                        onToggle(item.id);
                                        setSelectedNames(prev => ({ ...prev, [item.id]: item.name }));
                                    }
                                    setIsOpen(false);
                                    setSearchTerm('');
                                }}
                            >
                                {item.name}
                                {selectedIds.includes(item.id) && <span className="check-icon">✓</span>}
                            </div>
                        ))}
                    </div>
                )}

                {/* Hints - shown when input is empty */}
                {!searchTerm && hints && hints.length > 0 && (
                    <div className="filter-hints">
                        {hintsLabel && <span className="filter-hints__label">{hintsLabel}</span>}
                        {hints.map((hint) => (
                            <button
                                key={hint}
                                type="button"
                                className="filter-hint-chip"
                                onClick={() => {
                                    setSearchTerm(hint);
                                    setIsOpen(true);
                                }}
                            >
                                {hint}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {selectedIds.length > 0 && (
                <div className="filter-tags">
                    {selectedIds.map((id) => (
                        <div key={id} className="filter-tag">
                            <span className="filter-tag-label">{selectedNames[id] || `ID: ${id}`}</span>
                            <button
                                className="filter-tag-remove"
                                onClick={() => onToggle(id)}
                                aria-label="Remove filter"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    ))}
                    <button className="filter-clear-all" onClick={() => {
                        onClear?.();
                        setSelectedNames({});
                    }}>
                        {clearLabel}
                    </button>
                </div>
            )}
        </div>
    );
};

export default FilterSidebar;
