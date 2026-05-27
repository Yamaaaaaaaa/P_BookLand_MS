import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { Category } from '../../../types/Category';
import categoryService from '../../../api/categoryService';
import AdminModal, { type FieldConfig } from '../../../components/admin/AdminModal';
import Pagination from '../../../components/admin/Pagination';
import '../../../styles/components/buttons.css';
import '../../../styles/components/forms.css';
import '../../../styles/pages/admin-management.css';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

const CategoryPage = () => {
    const { t } = useTranslation();
    const [categories, setCategories] = useState<Category[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Server-side Pagination & Sort State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [itemsPerPage] = useState(5);
    const [sortConfig, setSortConfig] = useState<{ key: keyof Category; direction: 'asc' | 'desc' } | null>({ key: 'id', direction: 'asc' });

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'update' | 'view'>('create');
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

    const fetchCategories = async () => {
        try {
            const params: any = {
                page: currentPage - 1, // API usually 0-indexed
                size: itemsPerPage,
                keyword: searchTerm || undefined, // Only send if not empty
            };

            if (sortConfig) {
                params.sortBy = sortConfig.key;
                params.sortDirection = sortConfig.direction.toUpperCase();
            }

            const response = await categoryService.getAll(params);

            if (response.result) {
                // Check if result is a Page object (has content and totalPages)
                if (response.result.content && typeof response.result.totalPages === 'number') {
                    setCategories(response.result.content);
                    setTotalPages(response.result.totalPages);
                } else if (Array.isArray(response.result)) {
                    // Fallback for non-paged response (unlikely given requirement but safe)
                    setCategories(response.result);
                    setTotalPages(1);
                }
            }
        } catch (error) {
            console.error("Error fetching categories:", error);
            toast.error(t('admin.category.toast.load_fail'));
        }
    };

    // Refetch when page, sort, or search changes
    // Debounce search could be added here or assuming user presses Enter (simple effect for now)
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchCategories();
        }, 300); // 300ms debounce for search
        return () => clearTimeout(timer);
    }, [currentPage, sortConfig, searchTerm]);

    const fieldConfig: FieldConfig[] = [
        { name: 'name', label: t('admin.category.modal.name_label'), type: 'text', required: true, placeholder: t('admin.category.modal.name_placeholder') },
        { name: 'description', label: t('admin.category.modal.desc_label'), type: 'textarea', placeholder: t('admin.category.modal.desc_placeholder') },
        { name: 'pin', label: t('admin.category.modal.pin_label', { defaultValue: 'Ghim danh mục' }), type: 'checkbox' },
        { name: 'imageUrl', label: t('admin.category.modal.image_label', { defaultValue: 'Hình ảnh đại diện' }), type: 'image' }
    ];

    const handleSort = (key: keyof Category) => {
        setSortConfig(current => {
            let direction: 'asc' | 'desc' = 'asc';
            if (current && current.key === key && current.direction === 'asc') {
                direction = 'desc';
            }
            return { key, direction };
        });
        // Reset to page 1 on sort change usually? Or keep page? 
        // Keeping page is fine, or reset. Let's keep page for now.
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1); // Reset to page 1 on search
    };

    const openModal = (mode: 'create' | 'update' | 'view', category?: Category) => {
        setModalMode(mode);
        setSelectedCategory(category || null);
        setIsModalOpen(true);
    };

    const handleModalSubmit = async (data: any) => {
        try {
            if (modalMode === 'update' && selectedCategory) {
                await categoryService.update(selectedCategory.id, data);
                toast.success(t('admin.category.toast.update_success'));
            } else if (modalMode === 'create') {
                await categoryService.create(data);
                toast.success(t('admin.category.toast.create_success'));
            }
            fetchCategories();
            setIsModalOpen(false);
        } catch (error) {
            console.error(error);
            toast.error(t('admin.category.toast.action_fail'));
        }
    };

    const handleDelete = async (id: number) => {
        if (window.confirm(t('admin.category.toast.delete_confirm'))) {
            try {
                await categoryService.delete(id);
                toast.success(t('admin.category.toast.delete_success'));
                fetchCategories();
            } catch (error) {
                console.error(error);
                toast.error(t('admin.category.toast.delete_fail'));
            }
        }
    };

    const getSortIcon = (key: keyof Category) => {
        if (sortConfig?.key !== key) return <ArrowUpDown size={14} className="sort-icon inactive" />;
        return sortConfig.direction === 'asc'
            ? <ArrowUp size={14} className="sort-icon active" />
            : <ArrowDown size={14} className="sort-icon active" />;
    };

    const getModalTitle = () => {
        switch (modalMode) {
            case 'create': return t('admin.category.modal.create_title');
            case 'update': return t('admin.category.modal.update_title');
            case 'view': return t('admin.category.modal.view_title');
            default: return '';
        }
    };

    return (
        <div className="admin-container">
            <div className="admin-header">
                <div>
                    <h1 className="admin-title">{t('admin.category.title')}</h1>
                    <p className="admin-subtitle">{t('admin.category.subtitle')}</p>
                </div>
                <button className="btn-primary" onClick={() => openModal('create')}>
                    <Plus size={20} />
                    {t('admin.category.add_btn')}
                </button>
            </div>

            <div className="admin-toolbar">
                <div className="search-box">
                    <Search size={18} className="search-box-icon" />
                    <input
                        type="text"
                        className="search-input"
                        placeholder={t('admin.category.search_placeholder')}
                        value={searchTerm}
                        onChange={handleSearchChange}
                    />
                </div>
            </div>

            <div className="admin-table-container margin-top">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th onClick={() => handleSort('id')} className="sortable-header" style={{ width: '80px' }}>
                                <div className="th-content">
                                    {t('admin.category.table.id')}
                                    {getSortIcon('id')}
                                </div>
                            </th>
                            <th style={{ width: '80px', textAlign: 'center' }}>{t('admin.category.table.image', { defaultValue: 'Ảnh' })}</th>
                            <th onClick={() => handleSort('name')} className="sortable-header">
                                <div className="th-content">
                                    {t('admin.category.table.name')}
                                    {getSortIcon('name')}
                                </div>
                            </th>
                            <th onClick={() => handleSort('description')} className="sortable-header">
                                <div className="th-content">
                                    {t('admin.category.table.description')}
                                    {getSortIcon('description')}
                                </div>
                            </th>
                            <th style={{ width: '60px', textAlign: 'center' }}>{t('admin.category.table.pin', { defaultValue: 'Ghim' })}</th>
                            <th style={{ textAlign: 'right' }}>{t('admin.category.table.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categories.map(category => (
                            <tr key={category.id}>
                                <td>#{category.id}</td>
                                <td style={{ textAlign: 'center' }}>
                                    {category.imageUrl ? (
                                        <img src={category.imageUrl} alt={category.name} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                                    ) : '-'}
                                </td>
                                <td style={{ fontWeight: 500 }}>{category.name}</td>
                                <td style={{ color: 'var(--shop-text-muted)' }}>{category.description || '-'}</td>
                                <td style={{ textAlign: 'center', fontSize: '1.2rem' }}>
                                    {category.pin ? <span style={{ color: 'var(--shop-primary)' }}>📌</span> : '-'}
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    <div className="action-buttons">
                                        <button className="btn-icon" onClick={() => openModal('view', category)}>
                                            <Eye size={18} />
                                        </button>
                                        <button className="btn-icon" onClick={() => openModal('update', category)}>
                                            <Edit size={18} />
                                        </button>
                                        <button className="btn-icon delete" onClick={() => handleDelete(category.id)}>
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {categories.length === 0 && (
                            <tr>
                                <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>
                                    {t('admin.category.no_data')}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
            />

            <AdminModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleModalSubmit}
                mode={modalMode}
                title={getModalTitle()}
                fields={fieldConfig}
                initialData={selectedCategory}
            />
        </div>
    );
};

export default CategoryPage;
